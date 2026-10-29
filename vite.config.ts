import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { AUDIO_CACHE } from './src/shared/constants/audio-cache';

/**
 * PocketBase в разработке
 *
 * Он слушает 127.0.0.1:8090, Vite проксирует к нему API и админку: приложение и в dev, и на бою
 * ходит к PocketBase по своему же адресу
 */
const POCKETBASE_URL = 'http://127.0.0.1:8090';

/** Порт Vite в разработке */
const DEV_PORT = 5173;

/** Кэш картинок service worker (тот же, что FILES_CACHE в shared/api/offline.ts) */
const FILES_CACHE = 'bounce-files';

/**
 * Цвет заставки и рамки до загрузки страницы - цвет фона тёмной темы
 *
 * Манифест знает один цвет; дальше цвет рамки меняется вместе с темой (features/theme)
 */
const MANIFEST_COLOR = '#161a22';

/** Секунд в сутках */
const DAY_SECONDS = 24 * 60 * 60;

/** Сколько дней хранятся картинки */
const FILES_MAX_AGE_DAYS = 30;

/** Сколько картинок хранится */
const FILES_MAX_ENTRIES = 500;

/** Сколько дней хранится аудио */
const AUDIO_MAX_AGE_DAYS = 60;

/** Сколько записей хранится: финальные версии бывают по сотне мегабайт, держим немного */
const AUDIO_MAX_ENTRIES = 40;

/** Кэшируются только полные удачные ответы */
const CACHEABLE_STATUSES = [200];

/** API и админка PocketBase - всегда в сеть, в кэш service worker их не берёт */
const NETWORK_ONLY_PATHS = [/^\/api\//, /^\/_\//];

/** Предупреждение о размере бандла: приложение целиком в кэше, один бандл около 300 КБ gzip - пока терпимо */
const CHUNK_SIZE_WARNING_KB = 700;

/** Параметры запроса service worker */
interface RequestParams {
  request: Request;
}

/** Параметры адреса service worker */
interface UrlParams {
  url: URL;
}

/** Параметры ответа service worker */
interface ResponseParams {
  response: Response;
}

// Функции правил кэша ниже workbox переносит в service worker текстом (через toString), поэтому
// внутри них только литералы: константы и импорты этого файла в service worker не попадут.

/** Ключ кэша - адрес без файлового токена: токен живёт час, файл - пока его не заменят */
function getCacheKey({ request }: RequestParams): Promise<string> {
  const cacheUrl = new URL(request.url);
  cacheUrl.searchParams.delete('token');

  return Promise.resolve(cacheUrl.href);
}

/** Картинка из файлов PocketBase */
function checkIsImageFile({ url }: UrlParams): boolean {
  const isFile = url.pathname.startsWith('/api/files/');

  return isFile && /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(url.pathname);
}

/** Аудио из файлов PocketBase; ссылка на скачивание (?download) идёт в сеть: у неё свой заголовок с именем файла */
function checkIsAudioFile({ url }: UrlParams): boolean {
  const isFile = url.pathname.startsWith('/api/files/');
  const isAudio = /\.(mp3|wav|flac|m4a|mp4|aac|ogg|oga|opus|webm)$/i.test(
    url.pathname
  );

  return [isFile, isAudio, !url.searchParams.has('download')].every(Boolean);
}

/** Большой файл в кэш не кладётся: предел 60 МБ - тот же, что AUDIO_CACHE_MAX в shared/api/audio-cache.ts */
function filterLargeAudio({
  response,
}: ResponseParams): Promise<Response | null> {
  const size = Number(response.headers.get('content-length') ?? 0);

  if (size > 60 * 1024 * 1024) {
    return Promise.resolve(null);
  }

  return Promise.resolve(response);
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // новая версия не перезагружает открытую страницу сама: app/utils/update.ts
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
        background_color: MANIFEST_COLOR,
        theme_color: MANIFEST_COLOR,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // из шрифта - только кириллица и латиница: остальные наборы глифов приложению не нужны
        globPatterns: [
          '**/*.{js,css,html,svg,png,webmanifest}',
          '**/onest-{cyrillic,cyrillic-ext,latin,latin-ext}-wght-*.woff2',
        ],
        navigateFallbackDenylist: NETWORK_ONLY_PATHS,
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
            urlPattern: checkIsImageFile,
            handler: 'CacheFirst',
            options: {
              cacheName: FILES_CACHE,
              expiration: {
                maxEntries: FILES_MAX_ENTRIES,
                maxAgeSeconds: FILES_MAX_AGE_DAYS * DAY_SECONDS,
              },
              cacheableResponse: { statuses: CACHEABLE_STATUSES },
              plugins: [{ cacheKeyWillBeUsed: getCacheKey }],
            },
          },
          // Аудио, которое уже слушали, играет с устройства, в том числе без сети. Плеер просит
          // файл кусками (Range); куски в кэш не попадают, а целиком файл скачивает
          // shared/api/audio-cache.ts после запуска записи. Из кэша куски нарезает rangeRequests - он
          // читает файл целиком на каждый кусок, поэтому большие файлы (длинные WAV) не
          // кэшируются: телефону это стоило бы памяти.
          {
            urlPattern: checkIsAudioFile,
            handler: 'CacheFirst',
            options: {
              cacheName: AUDIO_CACHE,
              rangeRequests: true,
              expiration: {
                maxEntries: AUDIO_MAX_ENTRIES,
                maxAgeSeconds: AUDIO_MAX_AGE_DAYS * DAY_SECONDS,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: CACHEABLE_STATUSES },
              plugins: [
                {
                  cacheKeyWillBeUsed: getCacheKey,
                  cacheWillUpdate: filterLargeAudio,
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
    port: DEV_PORT,
    proxy: {
      '/api': { target: POCKETBASE_URL, changeOrigin: false },
      '/_': { target: POCKETBASE_URL, changeOrigin: false },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: CHUNK_SIZE_WARNING_KB,
  },
});
