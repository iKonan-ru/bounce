const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

// id записи в формате PocketBase: 15 символов [a-z0-9]. Свой id нужен, когда в одном пакетном
// запросе на запись ссылаются следующие запросы (песня и её этапы).
export function newRecordId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  let id = '';
  for (const b of bytes) id += ALPHABET[b % ALPHABET.length];
  return id;
}
