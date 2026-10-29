import { MINUTE_MS } from './format';

/** Токен для ссылок на закрытые файлы живёт час (схема users): берём новый раз в 30 минут */
export const FILE_TOKEN_REFRESH_MS = 30 * MINUTE_MS;
