import { registerSW } from 'virtual:pwa-register';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { RouterProvider } from '@tanstack/react-router';
import { ClientResponseError } from 'pocketbase';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from '@/components/ui/sonner';
import { logout, refreshAuth } from '@/lib/auth';
import { CACHE_BUSTER, CACHE_MAX_AGE, clearOfflineData, persister } from '@/lib/offline';
import { clearOutbox, startOutbox } from '@/lib/outbox';
import { pb } from '@/lib/pb';
import { initTheme } from '@/lib/theme';
import './index.css';
import { router } from './router';

initTheme();

// новая версия service worker ставится сама и вступает в силу при следующем открытии
if (import.meta.env.PROD) registerSW({ immediate: true });

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

// сессию отозвали: снова вход
queryClient.getQueryCache().subscribe((event) => {
  const err = event.query.state.error;
  if (err instanceof ClientResponseError && err.status === 401) logout();
});

// выход (или отзыв сессии): данные, картинки и черновики прежнего пользователя стираются
pb.authStore.onChange((token) => {
  if (!token) {
    void clearOfflineData(queryClient);
    void clearOutbox();
  }
});

void refreshAuth();
startOutbox(queryClient);

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
