/** Запасной текст ошибки для правки, которая не дошла до сервера */
export const SAVE_FAILED = 'Не сохранилось: проверьте соединение';

/** Статус ответа PocketBase "запрос отклонён": ошибка проверки или нет доступа */
export const BAD_REQUEST_STATUS = 400;

/** Статус "нет ответа": обрыв сети */
export const NO_RESPONSE_STATUS = 0;

/** С этого статуса начинаются сбои сервера и прокси */
export const SERVER_ERROR_STATUS = 500;

/** Статусы, после которых отправку стоит повторить: сеть, сессия, таймаут, частота запросов */
export const RETRY_STATUSES: ReadonlySet<number> = new Set([
  NO_RESPONSE_STATUS,
  401,
  403,
  408,
  429,
]);

/** Код ошибки поля id: запись с таким id уже есть */
export const NOT_UNIQUE_CODE = 'validation_not_unique';

/** Причина по-русски: такие пишут хуки Bounce */
export const CYRILLIC_RE = /[а-яё]/i;

/** Текст ошибки сети в браузерах */
export const NETWORK_ERROR_RE = /сеть|network|fetch/i;
