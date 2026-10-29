import { describe, expect, it } from 'vitest';
import type { Post } from '@/lib/model';
import { groupPosts, songPosts } from '@/lib/posts';

type P = Pick<Post, 'id' | 'status' | 'assignees' | 'anchor' | 'date' | 'offset' | 'song'>;

const post = (id: string, patch: Partial<P> = {}): P => ({
  id,
  status: 'idea',
  assignees: [],
  anchor: 'date',
  date: '',
  offset: 0,
  song: '',
  ...patch,
});

// сроки хранятся полднем UTC
const day = (d: string) => `${d} 12:00:00.000Z`;
const songs = [
  { id: 's1', target_release: day('2026-11-20') },
  { id: 's2', target_release: '' },
];
const today = new Date(2026, 10, 10, 9);
const ids = (list: ReadonlyArray<P>) => list.map((p) => p.id);

describe('контент-план по срокам', () => {
  it('открытые - по группам и дням, опубликованные - отдельно, сначала последние', () => {
    const { groups, published } = groupPosts(
      [
        post('later', { date: day('2026-12-01') }),
        post('none'),
        post('overdue', { date: day('2026-11-01') }),
        post('today', { date: day('2026-11-10') }),
        post('week2', { date: day('2026-11-14') }),
        post('week1', { date: day('2026-11-12') }),
        // от релиза песни s1: за 7 дней - 13 ноября
        post('release', { song: 's1', anchor: 'release', offset: -7 }),
        post('pub-old', { status: 'published', date: day('2026-10-01') }),
        post('pub-new', { status: 'published', date: day('2026-11-05') }),
      ],
      songs,
      today,
    );
    expect(groups.map((g) => [g.bucket, ids(g.items)])).toEqual([
      ['overdue', ['overdue']],
      ['today', ['today']],
      ['week', ['week1', 'release', 'week2']],
      ['later', ['later']],
      ['none', ['none']],
    ]);
    expect(ids(published)).toEqual(['pub-new', 'pub-old']);
  });

  it('в один день - как пришли; от релиза без даты релиза - без даты', () => {
    const { groups } = groupPosts(
      [
        post('b', { date: day('2026-11-12') }),
        post('a', { date: day('2026-11-12') }),
        post('no-release', { song: 's2', anchor: 'release', offset: 3 }),
      ],
      songs,
      today,
    );
    expect(groups.map((g) => [g.bucket, ids(g.items)])).toEqual([
      ['week', ['b', 'a']],
      ['none', ['no-release']],
    ]);
  });

  it('мои - только где я среди исполнителей', () => {
    const { groups, published } = groupPosts(
      [
        post('mine', { assignees: ['u1'] }),
        post('other', { assignees: ['u2'] }),
        post('pub', { status: 'published', assignees: ['u2'] }),
      ],
      songs,
      today,
      'u1',
    );
    expect(groups.flatMap((g) => ids(g.items))).toEqual(['mine']);
    expect(published).toEqual([]);
  });
});

describe('публикации песни', () => {
  it('только этой песни, по дате выхода; без даты - в конце; в один день - по сдвигу', () => {
    const list = songPosts(
      [
        post('other-song', { song: 's2', date: day('2026-11-01') }),
        post('no-date', { song: 's1' }),
        // своя дата в день релиза; сдвиг остался от прежней привязки к релизу
        post('same-day-own', { song: 's1', date: day('2026-11-20'), offset: 2 }),
        post('day', { song: 's1', anchor: 'release', offset: 0 }),
        post('before', { song: 's1', anchor: 'release', offset: -3 }),
      ],
      's1',
      songs,
    );
    expect(ids(list)).toEqual(['before', 'day', 'same-day-own', 'no-date']);
  });
});
