import type PocketBase from 'pocketbase';
import type { BatchService } from 'pocketbase';
import { newRecordId } from './id';
import type { Note, Song, StageTemplate, Substep } from './model';
import { collection } from './pb';

// Песня и её этапы из шаблона проекта - одной транзакцией (пакетный запрос PocketBase).
export async function createSong(
  client: PocketBase,
  projectId: string,
  title: string,
  templates: ReadonlyArray<StageTemplate>,
): Promise<Song> {
  const id = newRecordId();
  // новая песня - в начале списка
  const first = await collection(client, 'songs').getList<Song>(1, 1, {
    filter: client.filter('project = {:p}', { p: projectId }),
    sort: 'position',
    fields: 'position',
  });
  const position = (first.items[0]?.position ?? 1) - 1;
  const batch = client.createBatch();
  batch
    .collection('songs')
    .create({ id, project: projectId, title: title.trim(), status: 'not_started', position });
  addTemplateStages(batch, id, templates);
  await batch.send();
  return collection(client, 'songs').getOne(id);
}

// этапы шаблона проекта - в пакет запросов для песни songId, по порядку шаблона
function addTemplateStages(
  batch: BatchService,
  songId: string,
  templates: ReadonlyArray<StageTemplate>,
): void {
  [...templates]
    .sort((a, b) => a.position - b.position)
    .forEach((t, i) => {
      const substeps: Substep[] = (t.substeps ?? []).map((s) => ({
        id: newRecordId(),
        title: s.title,
        done: false,
      }));
      batch.collection('song_stages').create({
        song: songId,
        title: t.title,
        position: i,
        status: 'not_started',
        substeps,
      });
    });
}

// У песни без этапов (шаблон тогда был пуст или этапы удалили) - все этапы шаблона проекта
// одной транзакцией.
export async function stagesFromTemplate(
  client: PocketBase,
  songId: string,
  templates: ReadonlyArray<StageTemplate>,
): Promise<void> {
  if (templates.length === 0) return;
  const batch = client.createBatch();
  addTemplateStages(batch, songId, templates);
  await batch.send();
}

// Название песни из заметки: первая строка, не длиннее 80 знаков.
export function titleFromNote(text: string): string {
  const line = text.trim().split('\n')[0]?.trim() ?? '';
  return line.length > 80 ? `${line.slice(0, 79).trimEnd()}...` : line;
}

// Заметка проекта становится песней: песня с этапами шаблона, заметка ссылается на песню.
export async function songFromNote(
  client: PocketBase,
  note: Pick<Note, 'id' | 'project'>,
  title: string,
  templates: ReadonlyArray<StageTemplate>,
): Promise<Song> {
  const song = await createSong(client, note.project, title, templates);
  await collection(client, 'notes').update(note.id, { became_song: song.id });
  return song;
}
