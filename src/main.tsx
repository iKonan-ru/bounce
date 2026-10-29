import type { AuthRecord } from 'pocketbase';
import { ClientResponseError } from 'pocketbase';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from '@/app/ui';
import { dropForeignDrafts, flushOutbox, startOutbox } from '@/entities/note';
import { dropSession, refreshAuth } from '@/features/auth';
import { startOfflineSync } from '@/features/offline-sync';
import { initTheme } from '@/features/theme';
import { watchKeyboard } from '@/lib/keyboard';
import { startUpdates } from '@/lib/update';
import { persister, pb, clearOfflineData } from '@/shared/api';
import { CACHE_MAX_AGE, CACHE_BUSTER } from '@/shared/constants';
import type { Query, QueryCacheNotifyEvent } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { RouterProvider } from '@tanstack/react-router';
import './index.css';
import { router } from './router';

/** Сколько данные запроса считаются свежими и не перечитываются */
const STALE_TIME_MS = 30_000;

/** Сколько раз повторить запрос после сбоя сети или сервера */
const MAX_QUERY_RETRIES = 2;

/** С этого статуса начинаются отказы PocketBase (4xx) */
const CLIENT_ERROR_FIRST_STATUS = 400;

/** С этого статуса начинаются сбои сервера (5xx) */
const SERVER_ERROR_FIRST_STATUS = 500;

/** Статус ответа "сессия недействительна" */
const UNAUTHORIZED_STATUS = 401;

/** Id элемента, в который монтируется приложение */
const ROOT_ELEMENT_ID = 'root';

/** Ответ PocketBase с отказом 4xx: повтор запроса его не изменит */
function checkIsClientError(error: Error): boolean {
  if (!(error instanceof ClientResponseError)) {
    return false;
  }

  const isAboveMin = error.status >= CLIENT_ERROR_FIRST_STATUS;
  const isBelowMax = error.status < SERVER_ERROR_FIRST_STATUS;

  return isAboveMin && isBelowMax;
}

/** Повторять ли запрос: только сбои сети и 5xx, не больше MAX_QUERY_RETRIES раз */
function checkShouldRetry(failureCount: number, error: Error): boolean {
  if (checkIsClientError(error)) {
    return false;
  }

  return failureCount < MAX_QUERY_RETRIES;
}

/** Запрос загрузился: только такие сохраняются в кэш устройства */
function checkIsQuerySucceeded(query: Query): boolean {
  return query.state.status === 'success';
}

/** Id вошедшего пользователя; без действующей сессии - пустая строка */
function getSignedInId(hasSession: boolean, record: AuthRecord): string {
  if (!hasSession) {
    return '';
  }

  return record?.id ?? '';
}

initTheme();

watchKeyboard();

/** Клиент запросов приложения */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      /** Данные из кэша устройства живут, пока не истёк его срок (без сети - последние загруженные) */
      gcTime: CACHE_MAX_AGE,
      networkMode: 'offlineFirst',
      /** 4xx - ответ PocketBase, повтор его не изменит; повторяем только сбои сети и 5xx */
      retry: checkShouldRetry,
    },
    /** Без сети правка сразу сообщает об ошибке, а не ждёт молча */
    mutations: { networkMode: 'always' },
  },
});

/** Настройки сохранения кэша запросов на устройстве */
const PERSIST_OPTIONS: PersistQueryClientProviderProps['persistOptions'] = {
  persister,
  maxAge: CACHE_MAX_AGE,
  buster: CACHE_BUSTER,
  dehydrateOptions: { shouldDehydrateQuery: checkIsQuerySucceeded },
};

// сессию отозвали: снова вход (черновики заметок остаются до входа)
queryClient.getQueryCache().subscribe((event: QueryCacheNotifyEvent): void => {
  const error = event.query.state.error;
  const isUnauthorized =
    error instanceof ClientResponseError &&
    error.status === UNAUTHORIZED_STATUS;

  if (isUnauthorized) {
    dropSession();
  }
});

/** Id вошедшего пользователя: по нему видно, что вошёл другой человек */
let signedInId = getSignedInId(pb.authStore.isValid, pb.authStore.record);

// Выход или потерянная сессия: данные и картинки прежнего пользователя стираются с устройства.
// Вход: чужие черновики стираются, свои уходят на сервер. Продление токена того же человека
// (тоже событие authStore) ничего не меняет.
pb.authStore.onChange((token, record): void => {
  const userId = getSignedInId(Boolean(token), record);

  if (userId === signedInId) {
    return;
  }

  signedInId = userId;

  if (!userId) {
    void clearOfflineData(queryClient);

    return;
  }

  void dropForeignDrafts(userId).then(() => flushOutbox(queryClient));
});

startOutbox(queryClient, refreshAuth());

startOfflineSync(queryClient);

// новая версия ставится в фоне и включается при следующем запуске или по кнопке (lib/update.ts)
if (import.meta.env.PROD) {
  startUpdates();
}

/** Кэш устройства показан: сразу же перечитываем его с сервера */
const onCacheRestoreSuccess = (): Promise<void> =>
  queryClient.invalidateQueries();

/** Элемент, в который монтируется приложение */
const rootElement = document.getElementById(ROOT_ELEMENT_ID);

if (!rootElement) {
  throw new Error('нет #root');
}

createRoot(rootElement).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={PERSIST_OPTIONS}
      // кэш устройства показывается сразу, но сразу же и перечитывается с сервера: он мог
      // отстать (сохраняется раз в секунду, правки соавторов приходили без нас)
      onSuccess={onCacheRestoreSuccess}
    >
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </PersistQueryClientProvider>
  </StrictMode>
);
