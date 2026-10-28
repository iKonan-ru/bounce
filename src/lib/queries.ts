import { type QueryClient, queryOptions } from '@tanstack/react-query';
import type { Note, Post, Project, SongStage, StageTemplate, Task, User } from './model';
import { NOTE_EXPAND, type NoteScope, type NoteSort, scopeFilter } from './notes';
import { collection, pb } from './pb';
import type { SongsResponse } from './pb-types';

export type SongWithStages = SongsResponse<{ song_stages_via_song?: SongStage[] }>;

// этапы песни из expand (обратная связь song_stages.song) - по порядку
export function stagesOf(song: SongWithStages): SongStage[] {
  return [...(song.expand?.song_stages_via_song ?? [])].sort((a, b) => a.position - b.position);
}

const SONG_EXPAND = 'song_stages_via_song';
const PROJECT_EXPAND = 'owner,editors,contributors,viewers';

export const projectsQuery = queryOptions({
  queryKey: ['projects'],
  queryFn: () =>
    collection(pb, 'projects').getFullList<Project>({ sort: 'name', expand: PROJECT_EXPAND }),
});

export function projectQuery(id: string) {
  return queryOptions({
    queryKey: ['projects', id],
    queryFn: () => collection(pb, 'projects').getOne<Project>(id, { expand: PROJECT_EXPAND }),
  });
}

export function songsQuery(projectId: string) {
  return queryOptions({
    queryKey: ['songs', 'project', projectId],
    queryFn: () =>
      collection(pb, 'songs').getFullList<SongWithStages>({
        filter: pb.filter('project = {:p}', { p: projectId }),
        sort: 'position,-created',
        expand: SONG_EXPAND,
      }),
  });
}

export function songQuery(id: string) {
  return queryOptions({
    queryKey: ['songs', id],
    queryFn: () => collection(pb, 'songs').getOne<SongWithStages>(id, { expand: SONG_EXPAND }),
  });
}

export function templatesQuery(projectId: string) {
  return queryOptions({
    queryKey: ['stage_templates', projectId],
    queryFn: () =>
      collection(pb, 'stage_templates').getFullList<StageTemplate>({
        filter: pb.filter('project = {:p}', { p: projectId }),
        sort: 'position',
      }),
  });
}

export const usersQuery = queryOptions({
  queryKey: ['users'],
  queryFn: () => collection(pb, 'users').getFullList<User>({ sort: 'name' }),
});

export function notesQuery(scope: NoteScope) {
  return queryOptions({
    queryKey: ['notes', scope.project, scope.song ?? '', scope.stage ?? ''],
    queryFn: () =>
      collection(pb, 'notes').getFullList<Note>({
        filter: scopeFilter(pb, scope),
        sort: '-created',
        expand: NOTE_EXPAND,
      }),
  });
}

// раздел "Все заметки": фильтр собирает notesFilter
export function allNotesQuery(projectId: string, filter: string, sort: NoteSort) {
  return queryOptions({
    queryKey: ['notes', projectId, 'all', filter, sort],
    queryFn: () =>
      collection(pb, 'notes').getFullList<Note>({
        filter,
        sort: sort === 'new' ? '-created' : 'created',
        expand: NOTE_EXPAND,
      }),
  });
}

// задачи планировщика: открытые и выполненные за последние две недели
export function tasksQuery(projectId: string) {
  return queryOptions({
    queryKey: ['tasks', projectId],
    queryFn: () => {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60_000).toISOString().replace('T', ' ');
      return collection(pb, 'tasks').getFullList<Task>({
        filter: pb.filter('project = {:p} && (done = false || done_at >= {:since})', {
          p: projectId,
          since,
        }),
        sort: 'created',
      });
    },
  });
}

// контент-план проекта: все публикации
export function postsQuery(projectId: string) {
  return queryOptions({
    queryKey: ['posts', projectId],
    queryFn: () =>
      collection(pb, 'posts').getFullList<Post>({
        filter: pb.filter('project = {:p}', { p: projectId }),
        sort: 'created',
      }),
  });
}

// токен для ссылок на закрытые файлы: живёт час (схема users), берём новый раз в 30 минут
export const fileTokenQuery = queryOptions({
  queryKey: ['file-token'],
  queryFn: () => pb.files.getToken(),
  staleTime: 30 * 60_000,
  refetchInterval: 30 * 60_000,
});

// Изменения от других участников приходят по realtime PocketBase: запись коллекции
// перечитывает её запросы. Возвращает отписку.
export function subscribeRealtime(client: QueryClient): () => void {
  const refresh = (key: string) => () => void client.invalidateQueries({ queryKey: [key] });
  const subs = [
    pb.collection('projects').subscribe('*', refresh('projects')),
    pb.collection('songs').subscribe('*', refresh('songs')),
    pb.collection('song_stages').subscribe('*', refresh('songs')),
    pb.collection('stage_templates').subscribe('*', refresh('stage_templates')),
    pb.collection('notes').subscribe('*', refresh('notes')),
    pb.collection('tasks').subscribe('*', refresh('tasks')),
    pb.collection('posts').subscribe('*', refresh('posts')),
    // без сети подписка не встанет; SDK переподключится сам, когда связь вернётся
  ].map((p) => p.catch(() => undefined));
  return () => {
    for (const s of subs) void s.then((unsubscribe) => unsubscribe?.()).catch(() => undefined);
  };
}
