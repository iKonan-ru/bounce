import type { BatchService } from 'pocketbase';
import type PocketBase from 'pocketbase';
import type { Note } from '@/entities/note';
import { Collections, getCollection } from '@/shared/api';
import { comparePositions, getNewRecordId } from '@/shared/utils';
import type { StageTemplate, Substep, Song } from '../types/song';
import { StageStatus, SongStatus } from '../types/song';

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
