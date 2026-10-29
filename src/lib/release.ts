import type { Song, SongStatus } from './model';

// Релиз песни: дата, отправка на лейбл и что для неё нужно.

export const RELEASE_COVER_SIZE = 3000;

// день релиза наступил (по местному времени); дата хранится полднем UTC
export function releaseDue(iso: string | undefined, now = new Date()): boolean {
  const day = (iso ?? '').slice(0, 10);
  if (!day) return false;
  const p = (n: number) => String(n).padStart(2, '0');
  return day <= `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

// статус для показа: сервер переводит отправленную песню в выпущенные раз в час, а здесь это
// видно сразу в день релиза
export function songStatus(song: Pick<Song, 'status' | 'target_release'>): SongStatus {
  return song.status === 'sent' && releaseDue(song.target_release) ? 'released' : song.status;
}

// чего не хватает для отправки на лейбл (так же проверяет сервер, pb_hooks/lib/release.js)
export function releaseMissing(song: {
  lyrics?: string | undefined;
  release_cover?: string | undefined;
  target_release?: string | undefined;
}): string[] {
  const missing: string[] = [];
  if (!song.target_release) missing.push('дата релиза');
  if (!(song.lyrics ?? '').trim()) missing.push('текст песни');
  if (!song.release_cover) missing.push('обложка для релиза');
  return missing;
}
