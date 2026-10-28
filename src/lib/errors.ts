import { ClientResponseError } from 'pocketbase';

// Отказ сервера с понятной причиной (например, для отправки на лейбл нет текста) - его словами,
// остальное - запасным текстом.
export function errorText(e: unknown, fallback: string): string {
  return e instanceof ClientResponseError && e.status === 400 && e.message ? e.message : fallback;
}
