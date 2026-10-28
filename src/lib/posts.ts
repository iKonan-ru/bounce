import type { QueryClient } from '@tanstack/react-query';
import type PocketBase from 'pocketbase';
import { fromDay, toDay } from './format';
import type { Post, PostStatus, Song } from './model';
import { collection, pb } from './pb';

// Контент-план: публикации проекта. Дата - обычная (anchor = date) или от даты релиза песни
// (anchor = release, offset - дней до (-) или после (+) релиза): если релиз переносят,
// публикация переезжает вместе с ним.

export type NewPost = {
  project: string;
  title: string;
  author: string;
  song?: string;
  anchor?: 'date' | 'release';
  date?: string;
  offset?: number;
  assignees?: string[];
  platforms?: string[];
};

export function createPost(client: PocketBase, p: NewPost): Promise<Post> {
  return collection(client, 'posts').create<Post>({
    project: p.project,
    title: p.title.trim(),
    author: p.author,
    song: p.song ?? '',
    status: 'idea',
    anchor: p.anchor ?? 'date',
    date: p.date ?? '',
    offset: p.offset ?? 0,
    assignees: p.assignees ?? [],
    platforms: p.platforms ?? [],
  });
}

export type PostPatch = Partial<
  Pick<
    Post,
    | 'title'
    | 'text'
    | 'status'
    | 'platforms'
    | 'song'
    | 'anchor'
    | 'date'
    | 'offset'
    | 'time'
    | 'assignees'
  >
>;

// Правка публикации: сразу в кэше, потом на сервере.
export async function updatePost(
  client: QueryClient,
  post: Pick<Post, 'id' | 'project'>,
  patch: PostPatch,
): Promise<void> {
  client.setQueryData<Post[]>(['posts', post.project], (list) =>
    list?.map((p) => (p.id === post.id ? { ...p, ...patch } : p)),
  );
  try {
    await collection(pb, 'posts').update(post.id, patch);
  } finally {
    await client.invalidateQueries({ queryKey: ['posts'] });
  }
}

// Дата выхода публикации (полдень UTC, как все даты без времени): своя или от релиза песни.
// Пусто - даты пока нет (у песни не указан релиз).
export function postDate(
  post: Pick<Post, 'anchor' | 'date' | 'offset' | 'song'>,
  songs: ReadonlyArray<Pick<Song, 'id' | 'target_release'>>,
): string {
  if (post.anchor !== 'release') return post.date ?? '';
  const song = songs.find((s) => s.id === post.song);
  const day = toDay(song?.target_release ?? '');
  if (!day) return '';
  day.setDate(day.getDate() + (post.offset ?? 0));
  return fromDay(day);
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

// "в день релиза", "за 3 дня до релиза", "через неделю после релиза"
export function offsetLabel(offset: number): string {
  if (offset === 0) return 'в день релиза';
  const n = Math.abs(offset);
  const span =
    n % 7 === 0 && n <= 28
      ? n === 7
        ? 'неделю'
        : `${n / 7} ${plural(n / 7, 'неделю', 'недели', 'недель')}`
      : n === 1
        ? 'день'
        : `${n} ${plural(n, 'день', 'дня', 'дней')}`;
  return offset < 0 ? `за ${span} до релиза` : `через ${span} после релиза`;
}

// Промо-план песни: набор публикаций вокруг релиза, его потом правят под себя.
export const PROMO_TEMPLATE: ReadonlyArray<{ title: string; offset: number; platforms: string[] }> =
  [
    { title: 'Анонс релиза', offset: -14, platforms: ['instagram', 'vk', 'telegram'] },
    { title: 'Тизер', offset: -7, platforms: ['instagram', 'tiktok', 'youtube'] },
    { title: 'Завтра релиз', offset: -1, platforms: ['instagram', 'telegram'] },
    { title: 'Релиз: ссылка на bandlink', offset: 0, platforms: ['instagram', 'vk', 'telegram'] },
    { title: 'История создания', offset: 3, platforms: ['instagram', 'tiktok'] },
    { title: 'Лайв или клип', offset: 7, platforms: ['youtube', 'vk'] },
  ];

export const POST_STATUS_DOT: Record<PostStatus, string> = {
  idea: 'bg-led-off',
  preparing: 'bg-led-amber',
  ready: 'bg-led-cyan',
  published: 'bg-led-green',
};
