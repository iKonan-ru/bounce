import { registerSW } from 'virtual:pwa-register';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { ClientResponseError } from 'pocketbase';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from '@/components/ui/sonner';
import { logout, refreshAuth } from '@/lib/auth';
import './index.css';
import { router } from './router';

// новая версия service worker ставится сама и вступает в силу при следующем открытии
if (import.meta.env.PROD) registerSW({ immediate: true });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // 4xx - ответ PocketBase, повтор его не изменит; повторяем только сбои сети и 5xx
      retry: (n, e) =>
        !(e instanceof ClientResponseError && e.status >= 400 && e.status < 500) && n < 2,
    },
  },
});

// сессию отозвали: снова вход
queryClient.getQueryCache().subscribe((event) => {
  const err = event.query.state.error;
  if (err instanceof ClientResponseError && err.status === 401) logout();
});

void refreshAuth();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('нет #root');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </QueryClientProvider>
  </StrictMode>,
);
