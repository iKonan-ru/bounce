import type PocketBase from 'pocketbase';
import { newRecordId } from './id';
import type { Song, StageTemplate, Substep } from './model';
import { collection } from './pb';

export type NewSong = { title: string; bpm?: number; key?: string };

// Песня и её этапы из шаблона - одной транзакцией (пакетный запрос PocketBase).
export async function createSong(
  client: PocketBase,
  input: NewSong,
  templates: ReadonlyArray<StageTemplate>,
): Promise<Song> {
  const id = newRecordId();
  const batch = client.createBatch();
  batch.collection('songs').create({
    id,
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
