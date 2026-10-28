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
        description: 'Производство песен: этапы, тексты, находки',
        lang: 'ru',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
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
