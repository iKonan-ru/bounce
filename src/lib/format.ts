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

const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const dayMonthYear = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function parsePbDate(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

// Даты без времени (срок этапа, дата релиза) хранятся полднем UTC: в любом поясе это тот же день.
export function fromDateInput(value: string): string {
  return value ? `${value} 12:00:00.000Z` : '';
}

export function toDateInput(iso: string): string {
  const d = parsePbDate(iso);
  return d ? d.toISOString().slice(0, 10) : '';
}

export function dateLabel(iso: string): string {
  const d = parsePbDate(iso);
  if (!d) return '';
  return d.getFullYear() === new Date().getFullYear() ? dayMonth.format(d) : dayMonthYear.format(d);
}

// срок прошёл: день срока уже закончился
export function isOverdue(iso: string): boolean {
  const d = parsePbDate(iso);
  if (!d) return false;
  const today = new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10) < today;
}
