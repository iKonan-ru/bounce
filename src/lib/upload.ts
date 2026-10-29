import { ClientResponseError } from 'pocketbase';
import { pb } from './pb';

// Создание или правка записи с файлами и ходом загрузки. SDK PocketBase шлёт fetch, а у fetch
// нет событий хода отправки, поэтому здесь XMLHttpRequest с тем же токеном.
export function sendRecordForm<T>(
  collection: string,
  form: FormData,
  options: { id?: string; expand?: string; onProgress?: (fraction: number) => void },
): Promise<T> {
  const path = options.id
    ? `/api/collections/${collection}/records/${encodeURIComponent(options.id)}`
    : `/api/collections/${collection}/records`;
  const url = new URL(pb.buildURL(path), window.location.origin);
  if (options.expand) url.searchParams.set('expand', options.expand);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // ошибка - как у SDK (ClientResponseError со статусом и ответом PocketBase): одинаково
    // разбирают и обрыв сети (status 0), и отказ сервера с причиной
    const fail = (status: number, response: Record<string, unknown> = {}) =>
      reject(new ClientResponseError({ url: url.href, status, response }));
    xhr.open(options.id ? 'PATCH' : 'POST', url);
    if (pb.authStore.token) xhr.setRequestHeader('Authorization', pb.authStore.token);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) options.onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let record: T | undefined;
      let body: unknown = null;
      try {
        body = record = JSON.parse(xhr.responseText);
      } catch {
        // не JSON: например, страница ошибки прокси
      }
      if (xhr.status >= 200 && xhr.status < 300 && record !== undefined) {
        resolve(record);
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
