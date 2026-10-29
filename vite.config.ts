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
      // новая версия не перезагружает открытую страницу сама: lib/update.ts
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Bounce',
        short_name: 'Bounce',
        description: 'Производство песен: этапы, тексты, заметки',
        lang: 'ru',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // манифест знает один цвет: заставка при запуске и рамка до загрузки страницы -
        // в цвет фона тёмной темы, дальше цвет рамки меняется вместе с темой (lib/theme.ts)
        background_color: '#161a22',
        theme_color: '#161a22',
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
        // первый service worker сразу берёт открытую страницу: иначе в первом сеансе на
        // устройстве кнопка "Обновить" ничего бы не сделала
        clientsClaim: true,
        // Картинки (обложки, аватары, снимки в заметках) остаются на устройстве и открываются без
        // сети. Ссылка на закрытый файл несёт токен, который живёт час (fileToken в схеме), поэтому
        // ключ кэша - адрес без токена. Имя файла в PocketBase меняется при каждой замене файла,
        // так что файл из кэша не устаревает.
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
          // Аудио, которое уже слушали, играет с устройства, в том числе без сети. Плеер просит
          // файл кусками (Range); куски в кэш не попадают, а целиком файл скачивает
          // lib/audio-cache.ts после запуска записи. Из кэша куски нарезает rangeRequests - он
          // читает файл целиком на каждый кусок, поэтому файлы больше 60 МБ (длинные WAV) не
          // кэшируются: телефону это стоило бы памяти. Ссылка на скачивание (?download) идёт в
          // сеть: у неё свой заголовок с именем файла.
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/files/') &&
              /\.(mp3|wav|flac|m4a|mp4|aac|ogg|oga|opus|webm)$/i.test(url.pathname) &&
              !url.searchParams.has('download'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'bounce-audio',
              rangeRequests: true,
              // финальные версии бывают по сотне мегабайт: держим немного и только свежее
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 24 * 60 * 60,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [200] },
              plugins: [
                {
                  cacheKeyWillBeUsed: async ({ request }) => {
                    const u = new URL(request.url);
                    u.searchParams.delete('token');
                    return u.href;
                  },
                  // предел - тот же, что AUDIO_CACHE_MAX в lib/audio-cache.ts
                  cacheWillUpdate: async ({ response }) => {
                    const size = Number(response.headers.get('content-length') ?? 0);
                    return size <= 60 * 1024 * 1024 ? response : null;
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
  // приложение целиком в кэше service worker, один бандл около 300 КБ gzip - пока терпимо
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 700 },
});
