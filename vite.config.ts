import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// В разработке PocketBase слушает 127.0.0.1:8090, Vite проксирует к нему API и админку:
// приложение и в dev, и на бою ходит к PocketBase по своему же адресу.
const pocketbase = 'http://127.0.0.1:8090';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Bounce',
        short_name: 'Bounce',
        description: 'Производство песен: этапы, тексты, заметки',
        lang: 'ru',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0b0b0f',
        theme_color: '#0b0b0f',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // из шрифта - только кириллица и латиница: остальные наборы глифов приложению не нужны
        globPatterns: [
          '**/*.{js,css,html,svg,png,webmanifest}',
          '**/onest-{cyrillic,cyrillic-ext,latin,latin-ext}-wght-*.woff2',
        ],
        // API и админка PocketBase - всегда в сеть, в кэш service worker их не берёт
        navigateFallbackDenylist: [/^\/api\//, /^\/_\//],
        cleanupOutdatedCaches: true,
        // Картинки (обложки, аватары, снимки в заметках) остаются на устройстве и открываются без
        // сети. Ссылка на закрытый файл несёт токен, который меняется каждые полчаса, поэтому
        // ключ кэша - адрес без токена. Аудио не кэшируется: файлы большие, плеер просит куски.
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/files/') &&
              /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'bounce-files',
              expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [200] },
              plugins: [
                {
                  cacheKeyWillBeUsed: async ({ request }) => {
                    const u = new URL(request.url);
                    u.searchParams.delete('token');
                    return u.href;
                  },
                },
              ],
            },
          },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: pocketbase, changeOrigin: false },
      '/_': { target: pocketbase, changeOrigin: false },
    },
  },
  // приложение целиком в кэше service worker, один бандл около 170 КБ gzip - нормально
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 700 },
});
