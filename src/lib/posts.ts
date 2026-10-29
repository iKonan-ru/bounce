import type { QueryClient } from '@tanstack/react-query';
import type PocketBase from 'pocketbase';
import { fromDay, toDay } from './format';
import type { Post, PostStatus, Song } from './model';
import { optimisticEdit } from './optimistic';
import { collection, pb } from './pb';
import { BUCKETS, type Bucket, bucketOf } from './plan';
import { queryKeys } from './query-keys';

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
    'title' | 'text' | 'status' | 'platforms' | 'song' | 'anchor' | 'date' | 'offset' | 'assignees'
  >
>;

// Правка публикации: сразу в кэше, потом на сервере (lib/optimistic.ts).
export async function updatePost(
  client: QueryClient,
  post: Pick<Post, 'id' | 'project'>,
  patch: PostPatch,
): Promise<void> {
  await optimisticEdit(
    client,
    'posts',
    () =>
      client.setQueryData<Post[]>(queryKeys.posts.ofProject(post.project), (list) =>
        list?.map((p) => (p.id === post.id ? { ...p, ...patch } : p)),
      ),
    () => collection(pb, 'posts').update(post.id, patch),
  );
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

type Dated = Pick<Post, 'anchor' | 'date' | 'offset' | 'song'>;
type SongDates = ReadonlyArray<Pick<Song, 'id' | 'target_release'>>;

// Контент-план проекта: открытые публикации по срокам выхода (в порядке BUCKETS, пустые
// группы пропускаются; внутри - по дню выхода, в один день - как пришли) и опубликованные -
// сначала последние. mine - только те, где этот человек среди исполнителей.
export function groupPosts<P extends Dated & Pick<Post, 'status' | 'assignees'>>(
  posts: ReadonlyArray<P>,
  songs: SongDates,
  today: Date,
  mine?: string,
): { groups: { bucket: Bucket; items: P[] }[]; published: P[] } {
  const all = posts.filter((p) => !mine || (p.assignees ?? []).includes(mine));
  const open = all.filter((p) => p.status !== 'published');
  const published = all
    .filter((p) => p.status === 'published')
    .sort((a, b) => postDate(b, songs).localeCompare(postDate(a, songs)));
  const groups = BUCKETS.map((bucket) => ({
    bucket,
    items: open
      .filter((p) => bucketOf(postDate(p, songs), today) === bucket)
      .sort((a, b) =>
        postDate(a, songs).slice(0, 10).localeCompare(postDate(b, songs).slice(0, 10)),
      ),
  })).filter((g) => g.items.length > 0);
  return { groups, published };
}

// Публикации песни по дате выхода; без даты - в конце; в один день - по сдвигу от релиза.
export function songPosts<P extends Dated>(
  posts: ReadonlyArray<P>,
  songId: string,
  songs: SongDates,
): P[] {
  return posts
    .filter((p) => p.song === songId)
    .sort((a, b) => {
      const da = postDate(a, songs) || '9999';
      const db = postDate(b, songs) || '9999';
      return da.localeCompare(db) || (a.offset ?? 0) - (b.offset ?? 0);
    });
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

export const POST_STATUS_DOT: Record<PostStatus, string> = {
  idea: 'bg-led-off',
  preparing: 'bg-led-amber',
  ready: 'bg-led-cyan',
  published: 'bg-led-green',
};
