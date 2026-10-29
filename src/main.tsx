import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { RouterProvider } from '@tanstack/react-router';
import { ClientResponseError } from 'pocketbase';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from '@/components/ui/sonner';
import { dropSession, refreshAuth } from '@/lib/auth';
import { watchKeyboard } from '@/lib/keyboard';
import { CACHE_BUSTER, CACHE_MAX_AGE, clearOfflineData, persister } from '@/lib/offline';
import { startOfflineSync } from '@/lib/offline-sync';
import { dropForeignDrafts, flushOutbox, startOutbox } from '@/lib/outbox';
import { pb } from '@/lib/pb';
import { initTheme } from '@/lib/theme';
import { startUpdates } from '@/lib/update';
import './index.css';
import { router } from './router';

initTheme();
watchKeyboard();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // данные из кэша устройства живут, пока не истёк его срок (без сети - последние загруженные)
      gcTime: CACHE_MAX_AGE,
      networkMode: 'offlineFirst',
      // 4xx - ответ PocketBase, повтор его не изменит; повторяем только сбои сети и 5xx
      retry: (n, e) =>
        !(e instanceof ClientResponseError && e.status >= 400 && e.status < 500) && n < 2,
    },
    // без сети правка сразу сообщает об ошибке, а не ждёт молча
    mutations: { networkMode: 'always' },
  },
});

// сессию отозвали: снова вход (черновики заметок остаются до входа)
queryClient.getQueryCache().subscribe((event) => {
  const err = event.query.state.error;
  if (err instanceof ClientResponseError && err.status === 401) dropSession();
});

// Выход или потерянная сессия: данные и картинки прежнего пользователя стираются с устройства.
// Вход: чужие черновики стираются, свои уходят на сервер. Продление токена того же человека
// (тоже событие authStore) ничего не меняет.
let signedIn = pb.authStore.isValid ? (pb.authStore.record?.id ?? '') : '';
pb.authStore.onChange((token, record) => {
  const user = token ? (record?.id ?? '') : '';
  if (user === signedIn) return;
  signedIn = user;
  if (!user) {
    void clearOfflineData(queryClient);
    return;
  }
  void dropForeignDrafts(user).then(() => flushOutbox(queryClient));
});

startOutbox(queryClient, refreshAuth());
startOfflineSync(queryClient);
// новая версия ставится в фоне и включается при следующем запуске или по кнопке (lib/update.ts)
if (import.meta.env.PROD) startUpdates();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('нет #root');

createRoot(rootEl).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE,
        buster: CACHE_BUSTER,
        dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === 'success' },
      }}
      // кэш устройства показывается сразу, но сразу же и перечитывается с сервера: он мог
      // отстать (сохраняется раз в секунду, правки соавторов приходили без нас)
      onSuccess={() => queryClient.invalidateQueries()}
    >
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </PersistQueryClientProvider>
  </StrictMode>,
);
