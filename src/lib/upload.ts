import { ClientResponseError } from 'pocketbase';
import { type AbstractObject, checkIsObject } from './guards';
import { pb } from './pb';

/** Первый успешный статус HTTP */
const SUCCESS_STATUS_MIN = 200;

/** Первый статус HTTP после успешных */
const SUCCESS_STATUS_END = 300;

/** Статус "нет ответа": обрыв, отмена или таймаут */
const NO_RESPONSE_STATUS = 0;

/** Метод отправки формы */
export enum FormMethod {
  /** Создать запись */
  Create = 'POST',
  /** Изменить запись */
  Update = 'PATCH',
}

/** Параметры отправки формы */
export interface SendFormOptions {
  /** Параметры адреса запроса */
  query?: Record<string, string>;
  /** Доля отправленного (0..1) */
  onProgress?: (fraction: number) => void;
}

/** Параметры отправки записи с файлами */
export interface SendRecordFormOptions {
  /** Id записи для правки; без него запись создаётся */
  id?: string;
  expand?: string;
  onProgress?: (fraction: number) => void;
}

/** Тело ответа как JSON; не JSON (например, страница ошибки прокси) - undefined */
function parseJsonBody<Body>(text: string): Body | undefined {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error(error);

    return undefined;
  }
}

/**
 * Отправка формы с файлами и ходом загрузки
 *
 * SDK PocketBase шлёт fetch, а у fetch нет событий хода отправки, поэтому здесь XMLHttpRequest
 * с тем же токеном. Ошибка - как у SDK (ClientResponseError со статусом и ответом PocketBase):
 * одинаково разбираются и обрыв сети (status 0), и отказ сервера с причиной (errorText
 * показывает её текст)
 */
export function sendForm<Result>(
  method: FormMethod,
  path: string,
  form: FormData,
  options: SendFormOptions = {}
): Promise<Result> {
  const url = new URL(pb.buildURL(path), window.location.origin);
  for (const [name, value] of Object.entries(options.query ?? {})) {
    url.searchParams.set(name, value);
  }

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const rejectWithStatus = (
      status: number,
      response: AbstractObject = {}
    ): void => {
      reject(new ClientResponseError({ url: url.href, status, response }));
    };
    const rejectWithoutResponse = (): void => {
      rejectWithStatus(NO_RESPONSE_STATUS);
    };
    request.open(method, url);

    if (pb.authStore.token) {
      request.setRequestHeader('Authorization', pb.authStore.token);
    }

    request.upload.onprogress = (event) => {
      if (options.onProgress && event.lengthComputable) {
        options.onProgress(event.loaded / event.total);
      }
    };
    request.onload = () => {
      const result = parseJsonBody<Result>(request.responseText);
      const isSuccessStatus =
        request.status >= SUCCESS_STATUS_MIN &&
        request.status < SUCCESS_STATUS_END;

      if (isSuccessStatus && result !== undefined) {
        resolve(result);

        return;
      }

      const errorResponse: AbstractObject = {};

      if (checkIsObject(result)) {
        Object.assign(errorResponse, result);
      }

      rejectWithStatus(request.status, errorResponse);
    };
    request.onerror = rejectWithoutResponse;
    request.onabort = rejectWithoutResponse;
    request.ontimeout = rejectWithoutResponse;
    request.send(form);
  });
}

/** Адрес записей коллекции или одной записи */
function getRecordsPath(collection: string, id: string | undefined): string {
  const basePath = `/api/collections/${collection}/records`;

  if (!id) {
    return basePath;
  }

  return `${basePath}/${encodeURIComponent(id)}`;
}

/** Создание или правка записи с файлами */
export function sendRecordForm<Result>(
  collection: string,
  form: FormData,
  options: SendRecordFormOptions
): Promise<Result> {
  const formOptions: SendFormOptions = {};

  if (options.expand) {
    formOptions.query = { expand: options.expand };
  }

  if (options.onProgress) {
    formOptions.onProgress = options.onProgress;
  }

  const method = options.id ? FormMethod.Update : FormMethod.Create;

  return sendForm<Result>(
    method,
    getRecordsPath(collection, options.id),
    form,
    formOptions
  );
}

/** Ключ файла на устройстве для списков: имя, размер и время изменения */
export function getFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}
