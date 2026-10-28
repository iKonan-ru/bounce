import type PocketBase from 'pocketbase';
import { newRecordId } from './id';
import type { Note, Song, StageTemplate, Substep } from './model';
import { collection } from './pb';

export type NewSong = { title: string; bpm?: number; key?: string };

// Песня и её этапы из шаблона проекта - одной транзакцией (пакетный запрос PocketBase).
export async function createSong(
  client: PocketBase,
  projectId: string,
  input: NewSong,
  templates: ReadonlyArray<StageTemplate>,
): Promise<Song> {
  const id = newRecordId();
  const batch = client.createBatch();
  batch.collection('songs').create({
    id,
    project: projectId,
    title: input.title.trim(),
    status: 'active',
    bpm: input.bpm ?? null,
    key: input.key?.trim() ?? '',
  });
  [...templates]
    .sort((a, b) => a.position - b.position)
    .forEach((t, i) => {
      const substeps: Substep[] = (t.substeps ?? []).map((title) => ({ title, done: false }));
      batch.collection('song_stages').create({
        song: id,
        title: t.title,
        position: i,
        optional: t.optional,
        status: 'not_started',
        substeps,
      });
    });
  await batch.send();
  return collection(client, 'songs').getOne(id);
}

// Название песни из идеи: первая строка, не длиннее 80 знаков.
export function titleFromIdea(text: string): string {
  const line = text.trim().split('\n')[0]?.trim() ?? '';
  return line.length > 80 ? `${line.slice(0, 79).trimEnd()}...` : line || 'Новая песня';
}

// Идея проекта становится песней: песня с этапами шаблона, идея отмечается использованной и
// ссылается на песню.
export async function songFromIdea(
  client: PocketBase,
  idea: Pick<Note, 'id' | 'project' | 'text'>,
  title: string,
  templates: ReadonlyArray<StageTemplate>,
): Promise<Song> {
  const song = await createSong(client, idea.project, { title }, templates);
  await collection(client, 'notes').update(idea.id, { used: true, became_song: song.id });
  return song;
}
