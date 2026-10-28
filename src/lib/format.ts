const dateTime = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const dateTimeYear = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

// дата записи ленты: в этом году - с временем, раньше - с годом
export function noteDate(iso: string): string {
  const d = new Date(iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  return d.getFullYear() === new Date().getFullYear() ? dateTime.format(d) : dateTimeYear.format(d);
}

export function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`;
  return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
}

// имя файла без суффикса, который PocketBase добавляет при сохранении (mix_a1b2c3d4e5.wav)
export function displayFileName(stored: string): string {
  return stored.replace(/_[a-z0-9]{10}(\.[^.]+)$/i, '$1');
}
