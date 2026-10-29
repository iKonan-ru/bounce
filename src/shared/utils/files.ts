/** Ключ файла на устройстве для списков: имя, размер и время изменения */
export function getFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}
