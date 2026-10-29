/** Символы id записи PocketBase */
const RECORD_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Длина id записи PocketBase */
const RECORD_ID_LENGTH = 15;

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
