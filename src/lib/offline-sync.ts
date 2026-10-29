import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { type FileRecord, type Note, type SongWithStages, stagesOf } from './model';
import { NOTE_EXPAND, type NoteScope } from './notes';
import { editsInFlight } from './optimistic';
import { collection, pb } from './pb';
import {
  fileTokenQuery,
  notesQuery,
  postsQuery,
  projectQuery,
  promoQuery,
  songsQuery,
  tasksQuery,
  templatesQuery,
  usersQuery,
} from './queries';
import { isProjectSongsKey, isProjectsKey, queryKeys } from './query-keys';
import { mainCover } from './songs';

// Без сети открывается то, что лежит в кэше устройства (lib/offline.ts). Страница песни, этапа,
// плана берёт свои запросы, и если их не открывали с сетью, без сети показать нечего. Поэтому:
//
// - песни из списка проекта сразу раскладываются по запросам отдельных песен (и проекты из
//   списка - по запросам проектов): страница песни, этапа, текста открывается из списка;
// - при входе в проект и когда сеть вернулась проект загружается целиком: шаблон этапов,
//   план, публикации, промо-план, люди и все заметки одним запросом - заметки раскладываются
//   по лентам проекта, песен и этапов; обложки, аватары и снимки заметок попадают в кэш
//   картинок service worker. Не чаще раза в 10 минут на проект.

const SYNC_EVERY = 10 * 60_000;
// снимков заметок - только самые свежие: остальные откроются, когда будет сеть
const NOTE_IMAGES_MAX = 120;

const synced = new Map<string, number>();
const running = new Set<string>();

// данные свежее того, что уже лежит под ключом, - иначе не трогаем
function offer<T>(client: QueryClient, key: QueryKey, data: T, at: number) {
  const now = client.getQueryState(key);
  if (now && now.dataUpdatedAt >= at) return;
  client.setQueryData(key, data, { updatedAt: at });
}

function seedSongs(client: QueryClient, songs: ReadonlyArray<SongWithStages>, at: number) {
  // правка этапа в пути: её не затираем, раскладка будет при следующем ответе
  if (editsInFlight('songs')) return;
  for (const s of songs) offer(client, queryKeys.songs.one(s.id), s, at);
}

export function startOfflineSync(client: QueryClient): void {
  client.getQueryCache().subscribe((event) => {
    // manual - setQueryData (правки и сама раскладка), на них не отвечаем
    if (event.type !== 'updated' || event.action.type !== 'success' || event.action.manual) return;
    const { queryKey, state } = event.query;
    const at = state.dataUpdatedAt;
    if (isProjectSongsKey(queryKey) && Array.isArray(state.data)) {
      seedSongs(client, state.data, at);
    }
    if (isProjectsKey(queryKey) && Array.isArray(state.data)) {
      for (const p of state.data) {
        if (typeof p?.id === 'string') offer(client, queryKeys.projects.one(p.id), p, at);
      }
    }
  });
}

export async function syncProject(client: QueryClient, projectId: string): Promise<void> {
  if (!navigator.onLine || !pb.authStore.isValid || running.has(projectId)) return;
  if (Date.now() - (synced.get(projectId) ?? 0) < SYNC_EVERY) return;
  running.add(projectId);
  try {
    const at = Date.now();
    const [songs, notes, users] = await Promise.all([
      client.fetchQuery(songsQuery(projectId)),
      collection(pb, 'notes').getFullList<Note>({
        filter: pb.filter('project = {:p}', { p: projectId }),
        sort: '-created',
        expand: NOTE_EXPAND,
      }),
      client.fetchQuery(usersQuery),
      client.prefetchQuery(projectQuery(projectId)),
      client.prefetchQuery(templatesQuery(projectId)),
      client.prefetchQuery(promoQuery(projectId)),
      client.prefetchQuery(postsQuery(projectId)),
      client.prefetchQuery(tasksQuery(projectId)),
    ]);
    seedSongs(
      client,
      songs,
      client.getQueryState(songsQuery(projectId).queryKey)?.dataUpdatedAt ?? at,
    );
    spreadNotes(client, projectId, songs, notes, at);
    synced.set(projectId, Date.now());
    await warmPictures(client, songs, notes, users);
  } catch {
    // нет сети или сервер недоступен - в следующий раз
  } finally {
    running.delete(projectId);
  }
}

// заметки проекта по лентам - те же ключи и тот же порядок, что у notesQuery
function spreadNotes(
  client: QueryClient,
  project: string,
  songs: ReadonlyArray<SongWithStages>,
  notes: ReadonlyArray<Note>,
  at: number,
) {
  const put = (scope: NoteScope, list: Note[]) =>
    offer(client, notesQuery(scope).queryKey, list, at);
  put(
    { project },
    notes.filter((n) => !n.song),
  );
  for (const song of songs) {
    put(
      { project, song: song.id },
      notes.filter((n) => n.song === song.id && !n.stage),
    );
    for (const stage of stagesOf(song)) {
      put(
        { project, song: song.id, stage: stage.id },
        notes.filter((n) => n.stage === stage.id),
      );
    }
  }
}

// Картинки - теми же уменьшенными копиями, что просят страницы: service worker кладёт их в кэш
// (vite.config.ts), уже лежащие отдаёт из кэша без сети. По несколько за раз, чтобы не забить
// канал.
async function warmPictures(
  client: QueryClient,
  songs: ReadonlyArray<SongWithStages>,
  notes: ReadonlyArray<Note>,
  users: ReadonlyArray<FileRecord & { avatar?: string }>,
) {
  if (!navigator.serviceWorker?.controller) return;
  const token = await client.fetchQuery(fileTokenQuery);
  const urls: string[] = [];
  const add = (record: FileRecord, file: string | undefined, thumb: string) => {
    if (file) urls.push(pb.files.getURL(record, file, { token, thumb }));
  };
  for (const s of songs) {
    const cover = mainCover(s);
    add(s, cover, '96x96');
    add(s, cover, '600x600');
    add(s, s.release_cover, '600x600');
  }
  for (const u of users) add(u, u.avatar, '96x96');
  for (const n of notes.filter((n) => n.images?.length).slice(0, NOTE_IMAGES_MAX)) {
    for (const f of n.images ?? []) add(n, f, '480x0');
  }
  const queue = [...new Set(urls)];
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      if (!navigator.onLine) return;
      try {
        await (await fetch(url)).arrayBuffer();
      } catch {
        // одна картинка не загрузилась - остальные всё равно
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
}
