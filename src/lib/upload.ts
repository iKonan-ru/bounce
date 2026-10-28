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
    xhr.open(options.id ? 'PATCH' : 'POST', url);
    if (pb.authStore.token) xhr.setRequestHeader('Authorization', pb.authStore.token);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) options.onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('сеть недоступна'));
    xhr.send(form);
  });
}
