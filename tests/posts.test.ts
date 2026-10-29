import { describe, expect, it } from 'vitest';
import { type Post, PostAnchor, PostStatus } from '@/entities/post';
import { getSongPosts, groupPosts } from '@/entities/post';
import { Bucket } from '@/shared/types';

/** Публикация с полями, которые нужны контент-плану */
interface TestPost extends Pick<
  Post,
  'id' | 'status' | 'assignees' | 'anchor' | 'date' | 'offset' | 'song'
> {}

/** Время, на которое приходятся сроки: хранятся полднем UTC */
const NOON_UTC = '12:00:00.000Z';

/** Публикация-идея со своей датой (пока пустой); patch - отличия от неё */
function createPost(id: string, patch: Partial<TestPost> = {}): TestPost {
  return {
    id,
    status: PostStatus.idea,
    assignees: [],
    anchor: PostAnchor.date,
    date: '',
    offset: 0,
    song: '',
    ...patch,
  };
}

/** Срок в формате PocketBase: день и полдень UTC */
function toPbDate(day: string): string {
  return `${day} ${NOON_UTC}`;
}

/** Даты релиза песен: у s1 - 20 ноября, у s2 - нет */
const SONGS = [
  { id: 's1', target_release: toPbDate('2026-11-20') },
  { id: 's2', target_release: '' },
];

/** Сегодня в тестах: 10 ноября 2026, утро */
const TODAY = new Date(2026, 10, 10, 9);

/** Id публикаций списка по порядку */
function getIds(list: readonly TestPost[]): string[] {
  return list.map((post) => post.id);
}

describe('контент-план по срокам', () => {
  it('открытые - по группам и дням, опубликованные - отдельно, сначала последние', () => {
    const { groups, published } = groupPosts(
      [
        createPost('later', { date: toPbDate('2026-12-01') }),
        createPost('none'),
        createPost('overdue', { date: toPbDate('2026-11-01') }),
        createPost('today', { date: toPbDate('2026-11-10') }),
        createPost('week2', { date: toPbDate('2026-11-14') }),
        createPost('week1', { date: toPbDate('2026-11-12') }),
        // от релиза песни s1: за 7 дней - 13 ноября
        createPost('release', {
          song: 's1',
          anchor: PostAnchor.release,
          offset: -7,
        }),
        createPost('pub-old', {
          status: PostStatus.published,
          date: toPbDate('2026-10-01'),
        }),
        createPost('pub-new', {
          status: PostStatus.published,
          date: toPbDate('2026-11-05'),
        }),
      ],
      SONGS,
      TODAY
    );
    expect(groups.map((group) => [group.bucket, getIds(group.items)])).toEqual([
      [Bucket.Overdue, ['overdue']],
      [Bucket.Today, ['today']],
      [Bucket.Week, ['week1', 'release', 'week2']],
      [Bucket.Later, ['later']],
      [Bucket.None, ['none']],
    ]);
    expect(getIds(published)).toEqual(['pub-new', 'pub-old']);
  });

  it('в один день - как пришли; от релиза без даты релиза - без даты', () => {
    const { groups } = groupPosts(
      [
        createPost('b', { date: toPbDate('2026-11-12') }),
        createPost('a', { date: toPbDate('2026-11-12') }),
        createPost('no-release', {
          song: 's2',
          anchor: PostAnchor.release,
          offset: 3,
        }),
      ],
      SONGS,
      TODAY
    );
    expect(groups.map((group) => [group.bucket, getIds(group.items)])).toEqual([
      [Bucket.Week, ['b', 'a']],
      [Bucket.None, ['no-release']],
    ]);
  });

  it('мои - только где я среди исполнителей', () => {
    const { groups, published } = groupPosts(
      [
        createPost('mine', { assignees: ['u1'] }),
        createPost('other', { assignees: ['u2'] }),
        createPost('pub', { status: PostStatus.published, assignees: ['u2'] }),
      ],
      SONGS,
      TODAY,
      'u1'
    );
    expect(groups.flatMap((group) => getIds(group.items))).toEqual(['mine']);
    expect(published).toEqual([]);
  });
});

describe('публикации песни', () => {
  it('только этой песни, по дате выхода; без даты - в конце; в один день - по сдвигу', () => {
    const list = getSongPosts(
      [
        createPost('other-song', { song: 's2', date: toPbDate('2026-11-01') }),
        createPost('no-date', { song: 's1' }),
        // своя дата в день релиза; сдвиг остался от прежней привязки к релизу
        createPost('same-day-own', {
          song: 's1',
          date: toPbDate('2026-11-20'),
          offset: 2,
        }),
        createPost('day', {
          song: 's1',
          anchor: PostAnchor.release,
          offset: 0,
        }),
        createPost('before', {
          song: 's1',
          anchor: PostAnchor.release,
          offset: -3,
        }),
      ],
      's1',
      SONGS
    );
    expect(getIds(list)).toEqual(['before', 'day', 'same-day-own', 'no-date']);
  });
});
