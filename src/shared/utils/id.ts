import { RECORD_ID_LENGTH, RECORD_ID_ALPHABET } from '../constants/id';

/**
 * Id записи в формате PocketBase: 15 символов [a-z0-9]
 *
 * Свой id нужен, когда в одном пакетном запросе на запись ссылаются следующие запросы (песня и её этапы)
 */
export function getNewRecordId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(RECORD_ID_LENGTH));

  return Array.from(
    bytes,
    (byte) => RECORD_ID_ALPHABET[byte % RECORD_ID_ALPHABET.length]
  ).join('');
}
