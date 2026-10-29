import type PocketBase from 'pocketbase';
import type { BatchService } from 'pocketbase';
import { getNewRecordId } from './id';
import {
  comparePositions,
  type Note,
  type Song,
  SongStatus,
  StageStatus,
  type StageTemplate,
  type Substep,
} from './model';
import { Collections, getCollection } from './pb';

/** Название песни из заметки: не длиннее 80 знаков */
const SONG_TITLE_FROM_NOTE_MAX = 80;

/** Многоточие в конце обрезанного названия */
const ELLIPSIS = '...';

/** Поля песни с обложками */
interface SongCovers {
  covers?: readonly string[] | undefined;
  main_cover?: string | undefined;
  release_cover?: string | undefined;
}

/** Основная обложка песни: выбранная, иначе первая, иначе обложка для релиза */
export function getMainCover(song: SongCovers): string | undefined {
  const covers = song.covers ?? [];
  const galleryCover =
    covers.find((cover) => cover === song.main_cover) ?? covers[0];

  if (galleryCover) {
    return galleryCover;
  }

  return song.release_cover || undefined;
}

/** Этапы шаблона проекта - в пакет запросов для песни songId, по порядку шаблона */
function addTemplateStages(
  batch: BatchService,
  songId: string,
  templates: readonly StageTemplate[]
): void {
  const orderedTemplates = [...templates].sort(comparePositions);
  for (const [position, template] of orderedTemplates.entries()) {
    const substeps: Substep[] = (template.substeps ?? []).map((substep) => ({
      id: getNewRecordId(),
      title: substep.title,
      done: false,
    }));
    batch.collection(Collections.SongStages).create({
      song: songId,
      title: template.title,
      position,
      status: StageStatus.not_started,
      substeps,
    });
  }
}

/** Песня и её этапы из шаблона проекта - одной транзакцией (пакетный запрос PocketBase) */
export async function createSong(
  client: PocketBase,
  projectId: string,
  title: string,
  templates: readonly StageTemplate[]
): Promise<Song> {
  const id = getNewRecordId();
  // новая песня - в начале списка
  const firstSongPage = await getCollection(
    client,
    Collections.Songs
  ).getList<Song>(1, 1, {
    filter: client.filter('project = {:project}', { project: projectId }),
    sort: 'position',
    fields: 'position',
  });
  const position = (firstSongPage.items[0]?.position ?? 1) - 1;
  const batch = client.createBatch();
  batch.collection(Collections.Songs).create({
    id,
    project: projectId,
    title: title.trim(),
    status: SongStatus.not_started,
    position,
  });
  addTemplateStages(batch, id, templates);
  await batch.send();

  return getCollection(client, Collections.Songs).getOne(id);
}

/** У песни без этапов (шаблон тогда был пуст или этапы удалили) - все этапы шаблона проекта одной транзакцией */
export async function createStagesFromTemplate(
  client: PocketBase,
  songId: string,
  templates: readonly StageTemplate[]
): Promise<void> {
  if (templates.length === 0) {
    return;
  }

  const batch = client.createBatch();
  addTemplateStages(batch, songId, templates);
  await batch.send();
}

/** Название песни из заметки: первая строка, не длиннее 80 знаков */
export function getTitleFromNote(text: string): string {
  const firstLine = text.trim().split('\n')[0]?.trim() ?? '';

  if (firstLine.length <= SONG_TITLE_FROM_NOTE_MAX) {
    return firstLine;
  }

  const shortened = firstLine.slice(0, SONG_TITLE_FROM_NOTE_MAX - 1).trimEnd();

  return `${shortened}${ELLIPSIS}`;
}

/** Заметка проекта становится песней: песня с этапами шаблона, заметка ссылается на песню */
export async function createSongFromNote(
  client: PocketBase,
  note: Pick<Note, 'id' | 'project'>,
  title: string,
  templates: readonly StageTemplate[]
): Promise<Song> {
  const song = await createSong(client, note.project, title, templates);
  await getCollection(client, Collections.Notes).update(note.id, {
    became_song: song.id,
  });

  return song;
}
