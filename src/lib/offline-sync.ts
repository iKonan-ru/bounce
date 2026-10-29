import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { MINUTE_MS } from './format';
import { getField } from './guards';
import {
  type FileRecord,
  getOrderedStages,
  type Note,
  type SongWithStages,
} from './model';
import { NOTE_EXPAND, type NoteScope } from './notes';
import { checkIsEditInFlight } from './optimistic';
import { Collections, getCollection, pb } from './pb';
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
import {
  checkIsProjectSongsKey,
  checkIsProjectsKey,
  QueryRoot,
  queryKeys,
} from './query-keys';
import { getMainCover } from './songs';

// Без сети открывается то, что лежит в кэше устройства (lib/offline.ts). Страница песни, этапа,
// плана берёт свои запросы, и если их не открывали с сетью, без сети показать нечего. Поэтому:
//
// - песни из списка проекта сразу раскладываются по запросам отдельных песен (и проекты из
//   списка - по запросам проектов): страница песни, этапа, текста открывается из списка;
// - при входе в проект и когда сеть вернулась проект загружается целиком: шаблон этапов,
//   план, публикации, промо-план, люди и все заметки одним запросом - заметки раскладываются
//   по лентам проекта, песен и этапов; обложки, аватары и снимки заметок попадают в кэш
//   картинок service worker. Не чаще раза в 10 минут на проект.

/** Как часто проект загружается целиком */
const SYNC_EVERY = 10 * MINUTE_MS;

/** Снимков заметок - только самые свежие: остальные откроются, когда будет сеть */
const NOTE_IMAGES_MAX = 120;

/** Сколько картинок качается одновременно, чтобы не забить канал */
const PICTURE_WORKERS = 3;

/** Миниатюра обложки и аватара в списках */
const THUMB_SMALL = '96x96';

/** Обложка на странице песни */
const THUMB_COVER = '600x600';

/** Снимок в ленте заметок */
const THUMB_NOTE_IMAGE = '480x0';

/** Пользователь с аватаром */
interface AvatarRecord extends FileRecord {
  avatar?: string;
}

/** Когда проект загружался целиком последний раз */
const lastSyncedAt = new Map<string, number>();

/** Проекты, которые загружаются сейчас */
const syncingProjects = new Set<string>();

/** Данные свежее того, что уже лежит под ключом, - иначе не трогаем */
function offerQueryData<Data>(
  client: QueryClient,
  key: QueryKey,
  data: Data,
  updatedAt: number
): void {
  const currentState = client.getQueryState(key);

  if (currentState && currentState.dataUpdatedAt >= updatedAt) {
    return;
  }

  client.setQueryData(key, data, { updatedAt });
}

/** Песни списка - по запросам отдельных песен */
function seedSongs(
  client: QueryClient,
  songs: readonly SongWithStages[],
  updatedAt: number
): void {
  // правка этапа в пути: её не затираем, раскладка будет при следующем ответе
  if (checkIsEditInFlight(QueryRoot.Songs)) {
    return;
  }

  for (const song of songs) {
    offerQueryData(client, queryKeys.songs.one(song.id), song, updatedAt);
  }
}

/** Проекты списка - по запросам отдельных проектов */
function seedProjects(
  client: QueryClient,
  projects: readonly unknown[],
  updatedAt: number
): void {
  for (const project of projects) {
    const id = getField(project, 'id');

    if (typeof id === 'string') {
      offerQueryData(client, queryKeys.projects.one(id), project, updatedAt);
    }
  }
}

/** Раскладывать списки песен и проектов по запросам отдельных записей */
export function startOfflineSync(client: QueryClient): void {
  client.getQueryCache().subscribe((event) => {
    // manual - setQueryData (правки и сама раскладка), на них не отвечаем
    const isServerResponse =
      event.type === 'updated' &&
      event.action.type === 'success' &&
      !event.action.manual;

    if (!isServerResponse) {
      return;
    }

    const { queryKey, state } = event.query;

    if (!Array.isArray(state.data)) {
      return;
    }

    if (checkIsProjectSongsKey(queryKey)) {
      seedSongs(client, state.data, state.dataUpdatedAt);
    }

    if (checkIsProjectsKey(queryKey)) {
      seedProjects(client, state.data, state.dataUpdatedAt);
    }
  });
}

/** Заметки проекта по лентам - те же ключи и тот же порядок, что у notesQuery */
function spreadNotes(
  client: QueryClient,
  project: string,
  songs: readonly SongWithStages[],
  notes: readonly Note[],
  updatedAt: number
): void {
  const offerNotes = (scope: NoteScope, list: Note[]): void => {
    offerQueryData(client, notesQuery(scope).queryKey, list, updatedAt);
  };
  offerNotes(
    { project },
    notes.filter((note) => !note.song)
  );
  for (const song of songs) {
    offerNotes(
      { project, song: song.id },
      notes.filter((note) => note.song === song.id && !note.stage)
    );
    for (const stage of getOrderedStages(song)) {
      offerNotes(
        { project, song: song.id, stage: stage.id },
        notes.filter((note) => note.stage === stage.id)
      );
    }
  }
}

/** Скачать картинки по очереди; без сети - остановиться */
async function downloadQueue(queue: string[]): Promise<void> {
  for (let url = queue.shift(); url; url = queue.shift()) {
    if (!navigator.onLine) {
      return;
    }

    try {
      const response = await fetch(url);
      await response.arrayBuffer();
    } catch (error) {
      // одна картинка не загрузилась - остальные всё равно
      console.error(error);
    }
  }
}

/**
 * Картинки - теми же уменьшенными копиями, что просят страницы: service worker кладёт их в кэш
 * (vite.config.ts), уже лежащие отдаёт из кэша без сети
 *
 * По несколько за раз, чтобы не забить канал
 */
async function warmPictures(
  client: QueryClient,
  songs: readonly SongWithStages[],
  notes: readonly Note[],
  users: readonly AvatarRecord[]
): Promise<void> {
  if (!navigator.serviceWorker?.controller) {
    return;
  }

  const token = await client.fetchQuery(fileTokenQuery);
  const urls: string[] = [];
  const addUrl = (
    record: FileRecord,
    file: string | undefined,
    thumb: string
  ): void => {
    if (file) {
      urls.push(pb.files.getURL(record, file, { token, thumb }));
    }
  };
  for (const song of songs) {
    const cover = getMainCover(song);
    addUrl(song, cover, THUMB_SMALL);
    addUrl(song, cover, THUMB_COVER);
    addUrl(song, song.release_cover, THUMB_COVER);
  }
  for (const user of users) {
    addUrl(user, user.avatar, THUMB_SMALL);
  }
  const notesWithImages = notes
    .filter((note) => (note.images ?? []).length > 0)
    .slice(0, NOTE_IMAGES_MAX);
  for (const note of notesWithImages) {
    for (const image of note.images ?? []) {
      addUrl(note, image, THUMB_NOTE_IMAGE);
    }
  }
  const queue = [...new Set(urls)];
  const workers = Array.from({ length: PICTURE_WORKERS }, () =>
    downloadQueue(queue)
  );
  await Promise.all(workers);
}

/** Проект сейчас не загрузить: нет сети или сессии, уже загружается или загружался недавно */
function checkIsSyncBlocked(projectId: string): boolean {
  const isUnavailable = !navigator.onLine || !pb.authStore.isValid;

  if (isUnavailable || syncingProjects.has(projectId)) {
    return true;
  }

  return Date.now() - (lastSyncedAt.get(projectId) ?? 0) < SYNC_EVERY;
}

/** Загрузить проект целиком для работы без сети */
export async function syncProject(
  client: QueryClient,
  projectId: string
): Promise<void> {
  if (checkIsSyncBlocked(projectId)) {
    return;
  }

  syncingProjects.add(projectId);
  try {
    const startedAt = Date.now();
    const [songs, notes, users] = await Promise.all([
      client.fetchQuery(songsQuery(projectId)),
      getCollection(pb, Collections.Notes).getFullList<Note>({
        filter: pb.filter('project = {:project}', { project: projectId }),
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
    const songsUpdatedAt =
      client.getQueryState(songsQuery(projectId).queryKey)?.dataUpdatedAt ??
      startedAt;
    seedSongs(client, songs, songsUpdatedAt);
    spreadNotes(client, projectId, songs, notes, startedAt);
    lastSyncedAt.set(projectId, Date.now());
    await warmPictures(client, songs, notes, users);
  } catch (error) {
    // нет сети или сервер недоступен - в следующий раз
    console.error(error);
  } finally {
    syncingProjects.delete(projectId);
  }
}
