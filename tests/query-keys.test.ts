import { describe, expect, it } from 'vitest';
import { NoteSort } from '@/lib/notes';
import {
  Collections,
  checkIsProjectSongsKey,
  checkIsProjectsKey,
  getKeyRoot,
  queryKeys,
} from '@/shared/api';
import { REALTIME_ROOTS } from '@/shared/constants';
import { QueryRoot } from '@/shared/types';

// Кэш запросов хранится на устройстве под этими ключами (lib/offline.ts): форма ключа меняется
// только вместе с CACHE_BUSTER. Тест держит форму на месте.
describe('ключи запросов', () => {
  it('форма ключей', () => {
    expect(queryKeys.projects.all).toEqual(['projects']);
    expect(queryKeys.projects.one('p1')).toEqual(['projects', 'p1']);
    expect(queryKeys.songs.all).toEqual(['songs']);
    expect(queryKeys.songs.lists).toEqual(['songs', 'project']);
    expect(queryKeys.songs.ofProject('p1')).toEqual(['songs', 'project', 'p1']);
    expect(queryKeys.songs.one('s1')).toEqual(['songs', 's1']);
    expect(queryKeys.stageTemplates.ofProject('p1')).toEqual([
      'stage_templates',
      'p1',
    ]);
    expect(queryKeys.promo.ofProject('p1')).toEqual(['promo_templates', 'p1']);
    expect(queryKeys.users.all).toEqual(['users']);
    expect(queryKeys.notes.scope({ project: 'p1' })).toEqual([
      'notes',
      'p1',
      '',
      '',
    ]);
    expect(
      queryKeys.notes.scope({ project: 'p1', song: 's1', stage: 'st1' })
    ).toEqual(['notes', 'p1', 's1', 'st1']);
    expect(queryKeys.notes.search('p1', 'f', NoteSort.Newest)).toEqual([
      'notes',
      'p1',
      'all',
      'f',
      'new',
    ]);
    expect(queryKeys.tasks.ofProject('p1')).toEqual(['tasks', 'p1']);
    expect(queryKeys.posts.ofProject('p1')).toEqual(['posts', 'p1']);
    expect(queryKeys.fileToken).toEqual(['file-token']);
    expect(queryKeys.totpSetup('u1')).toEqual(['totp-setup', 'u1']);
  });

  it('раскладка без сети узнаёт списки по форме ключа', () => {
    expect(checkIsProjectSongsKey(queryKeys.songs.ofProject('p1'))).toBe(true);
    expect(checkIsProjectSongsKey(queryKeys.songs.one('s1'))).toBe(false);
    expect(checkIsProjectsKey(queryKeys.projects.all)).toBe(true);
    expect(checkIsProjectsKey(queryKeys.projects.one('p1'))).toBe(false);
    expect(getKeyRoot(queryKeys.tasks.ofProject('p1'))).toBe('tasks');
  });

  it('realtime: этапы перечитывают песни', () => {
    expect(REALTIME_ROOTS[Collections.SongStages]).toBe(QueryRoot.Songs);
    expect(Object.keys(REALTIME_ROOTS)).toEqual([
      'projects',
      'songs',
      'song_stages',
      'stage_templates',
      'promo_templates',
      'notes',
      'tasks',
      'posts',
    ]);
  });
});
