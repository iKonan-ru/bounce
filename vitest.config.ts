import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Тест с настоящим PocketBase может идти дольше пяти секунд по умолчанию */
const TEST_TIMEOUT_MS = 20_000;

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: TEST_TIMEOUT_MS,
  },
});
