import { ClientResponseError } from 'pocketbase';
import { pb } from './pb';

// Отправка формы с файлами и ходом загрузки. SDK PocketBase шлёт fetch, а у fetch нет событий
// хода отправки, поэтому здесь XMLHttpRequest с тем же токеном. Ошибка - как у SDK
// (ClientResponseError со статусом и ответом PocketBase): одинаково разбираются и обрыв сети
// (status 0), и отказ сервера с причиной (errorText показывает её текст).
export function sendForm<T>(
  method: 'POST' | 'PATCH',
  path: string,
  form: FormData,
  options: { query?: Record<string, string>; onProgress?: (fraction: number) => void } = {},
): Promise<T> {
  const url = new URL(pb.buildURL(path), window.location.origin);
  for (const [k, v] of Object.entries(options.query ?? {})) url.searchParams.set(k, v);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fail = (status: number, response: Record<string, unknown> = {}) =>
      reject(new ClientResponseError({ url: url.href, status, response }));
    xhr.open(method, url);
    if (pb.authStore.token) xhr.setRequestHeader('Authorization', pb.authStore.token);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) options.onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let result: T | undefined;
      let body: unknown = null;
      try {
        body = result = JSON.parse(xhr.responseText);
      } catch {
        // не JSON: например, страница ошибки прокси
      }
      if (xhr.status >= 200 && xhr.status < 300 && result !== undefined) {
        resolve(result);
        return;
      }
      fail(xhr.status, typeof body === 'object' && body !== null ? { ...body } : {});
    };
    xhr.onerror = () => fail(0);
    xhr.onabort = () => fail(0);
    xhr.ontimeout = () => fail(0);
    xhr.send(form);
  });
}

// Создание или правка записи с файлами.
export function sendRecordForm<T>(
  collection: string,
  form: FormData,
  options: { id?: string; expand?: string; onProgress?: (fraction: number) => void },
): Promise<T> {
  const path = options.id
    ? `/api/collections/${collection}/records/${encodeURIComponent(options.id)}`
    : `/api/collections/${collection}/records`;
  return sendForm<T>(options.id ? 'PATCH' : 'POST', path, form, {
    ...(options.expand ? { query: { expand: options.expand } } : {}),
    ...(options.onProgress ? { onProgress: options.onProgress } : {}),
  });
}
