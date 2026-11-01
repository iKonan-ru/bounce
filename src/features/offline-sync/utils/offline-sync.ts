// Без сети открывается то, что лежит в кэше устройства (shared/api/offline.ts). Страница песни, этапа,
// плана берёт свои запросы, и если их не открывали с сетью, без сети показать нечего. Поэтому:
//
// - песни из списка проекта сразу раскладываются по запросам отдельных песен (и проекты из
//   списка - по запросам проектов): страница песни, этапа, текста открывается из списка;
// - при входе в проект и когда сеть вернулась проект загружается целиком: шаблон этапов,
//   план, публикации, промо-план, люди и все заметки одним запросом - заметки раскладываются
//   по лентам проекта, песен и этапов и по первой странице раздела "Заметки"; обложки, аватары
//   и снимки заметок попадают в кэш картинок service worker. Не чаще раза в 10 минут на проект.
import type { Note } from '@/entities/note';
import {
  allNotesQuery,
  EMPTY_NOTES_FILTER,
  getNotesFilter,
  NOTE_EXPAND,
  NOTES_PAGE,
  NoteSort,
  notesQuery,
} from '@/entities/note';
import { promoQuery, postsQuery } from '@/entities/post';
import { projectQuery, ProjectDirection } from '@/entities/project';
import { projectTasksQuery, taskStagesQuery } from '@/entities/project-task';
import type { ProjectTask, TaskStage } from '@/entities/project-task';
import type { SongWithStages } from '@/entities/song';
import {
  getOrderedStages,
  getMainCover,
  songsQuery,
  templatesQuery,
} from '@/entities/song';
import { tasksQuery } from '@/entities/task';
import { usersQuery } from '@/entities/user';
import { videosQuery, videoQuery } from '@/entities/video';
import type { Video } from '@/entities/video';
import type { VideoPost } from '@/entities/video-post';
import { videoPostsQuery } from '@/entities/video-post';
import {
  checkIsEditInFlight,
  getNoteAccessVersion,
  queryKeys,
  checkIsProjectSongsKey,
  checkIsProjectVideosKey,
  checkIsProjectsKey,
  fileTokenQuery,
  pb,
  getCollection,
  Collections,
} from '@/shared/api';
import type { NoteScope, FileRecord } from '@/shared/types';
import { QueryRoot } from '@/shared/types';
import { getField } from '@/shared/utils';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import {
  THUMB_SMALL,
  THUMB_COVER,
  NOTE_IMAGES_MAX,
  THUMB_NOTE_IMAGE,
  PICTURE_WORKERS,
  SYNC_EVERY,
} from '../constants/offline-sync';
import type { AvatarRecord } from '../types/offline-sync';

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

/** Видео списка - по карточкам для открытия без сети */
function seedVideos(
  client: QueryClient,
  videos: readonly Video[],
  updatedAt: number
): void {
  if (checkIsEditInFlight(QueryRoot.Videos)) {
    return;
  }

  for (const video of videos) {
    offerQueryData(client, videoQuery(video.id).queryKey, video, updatedAt);
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

    if (checkIsProjectVideosKey(queryKey)) {
      seedVideos(client, state.data, state.dataUpdatedAt);
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
  videos: readonly Video[],
  updatedAt: number,
  taskStages: readonly TaskStage[],
  projectTasks: readonly ProjectTask[]
): void {
  const offerNotes = (scope: NoteScope, list: Note[]): void => {
    offerQueryData(client, notesQuery(scope).queryKey, list, updatedAt);
  };
  offerNotes(
    { project },
    notes.filter((note) => !note.song && !note.video && !note.other)
  );
  offerNotes(
    { project, other: true },
    notes.filter((note) => note.other && !note.other_stage)
  );
  const taskIds = projectTasks.map((task) => task.id);
  for (const taskId of taskIds) {
    offerNotes(
      { project, other: true, project_task: taskId },
      notes.filter((note) => note.project_task === taskId && !note.other_stage)
    );
  }
  for (const stage of taskStages) {
    offerNotes(
      {
        project,
        other: true,
        other_stage: stage.id,
        project_task: stage.project_task,
      },
      notes.filter((note) => note.other_stage === stage.id)
    );
  }
  for (const video of videos) {
    offerNotes(
      { project, video: video.id },
      notes.filter((note) => note.video === video.id && !note.video_stage)
    );
    for (const stage of video.expand?.video_stages_via_video ?? []) {
      offerNotes(
        { project, video: video.id, video_stage: stage.id },
        notes.filter((note) => note.video_stage === stage.id)
      );
    }
  }
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
  users: readonly AvatarRecord[],
  videos: readonly Video[],
  publications: readonly VideoPost[]
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
  for (const publication of publications) {
    addUrl(publication, publication.preview, THUMB_SMALL);
    addUrl(publication, publication.preview, THUMB_COVER);
  }
  for (const video of videos) {
    addUrl(video, video.preview, THUMB_SMALL);
    addUrl(video, video.preview, THUMB_COVER);
  }
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
    const userId = pb.authStore.record?.id;
    const startedAt = Date.now();
    const accessVersion = getNoteAccessVersion();
    const [
      songs,
      notes,
      users,
      videos,
      publications,
      taskStages,
      projectTasks,
    ] = await Promise.all([
      client.fetchQuery(songsQuery(projectId)),
      getCollection(pb, Collections.Notes).getFullList<Note>({
        filter: pb.filter('project = {:project}', { project: projectId }),
        sort: '-created',
        expand: NOTE_EXPAND,
      }),
      client.fetchQuery(usersQuery),
      client.fetchQuery(videosQuery(projectId)),
      client.fetchQuery(videoPostsQuery(projectId)),
      client.fetchQuery(taskStagesQuery(projectId)),
      client.fetchQuery(projectTasksQuery(projectId)),
      client.prefetchQuery(templatesQuery(projectId, ProjectDirection.video)),
      client.prefetchQuery(projectQuery(projectId)),
      client.prefetchQuery(templatesQuery(projectId)),
      client.prefetchQuery(promoQuery(projectId)),
      client.prefetchQuery(postsQuery(projectId)),
      client.prefetchQuery(tasksQuery(projectId)),
    ]);

    // Прямой запрос заметок не отменяется через client.clear() при выходе.
    // Сравниваем пользователя, а не токен: плановое обновление токена его меняет.
    const isSameSession =
      pb.authStore.isValid &&
      userId === pb.authStore.record?.id &&
      accessVersion === getNoteAccessVersion();

    if (!isSameSession) {
      return;
    }

    const songsUpdatedAt =
      client.getQueryState(songsQuery(projectId).queryKey)?.dataUpdatedAt ??
      startedAt;
    seedSongs(client, songs, songsUpdatedAt);
    seedVideos(client, videos, startedAt);
    spreadNotes(
      client,
      projectId,
      songs,
      notes,
      videos,
      startedAt,
      taskStages,
      projectTasks
    );
    // Раздел "Заметки" открывается с пустым фильтром - его первая страница тоже без сети
    const searchQuery = allNotesQuery(
      projectId,
      getNotesFilter(pb, projectId, EMPTY_NOTES_FILTER),
      NoteSort.Newest
    );
    offerQueryData(
      client,
      searchQuery.queryKey,
      {
        pages: [
          {
            page: 1,
            perPage: NOTES_PAGE,
            totalItems: notes.length,
            totalPages: Math.max(1, Math.ceil(notes.length / NOTES_PAGE)),
            items: notes.slice(0, NOTES_PAGE),
          },
        ],
        pageParams: [1],
      },
      startedAt
    );
    lastSyncedAt.set(projectId, Date.now());
    await warmPictures(client, songs, notes, users, videos, publications);
  } catch (error) {
    // нет сети или сервер недоступен - в следующий раз
    console.error(error);
  } finally {
    syncingProjects.delete(projectId);
  }
}
