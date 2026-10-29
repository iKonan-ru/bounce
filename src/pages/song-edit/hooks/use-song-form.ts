import { toast } from 'sonner';
import type { Song, SongStatus } from '@/entities/song';
import { getCollection, pb, Collections, queryKeys } from '@/shared/api';
import { SAVE_FAILED } from '@/shared/constants';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import type { UseSongFormResult, SongPatch } from '../types/song-edit';

/** Сохранение полей песни */
export function useSongForm(song: Song): UseSongFormResult {
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (patch: SongPatch): Promise<Song> =>
      getCollection(pb, Collections.Songs).update(song.id, patch),
    onSettled: (): Promise<void> =>
      client.invalidateQueries({ queryKey: queryKeys.songs.all }),
    onError: () => {
      toast.error(SAVE_FAILED);
    },
  });

  const onStatusSelect = (status: SongStatus): void => {
    save.mutate({ status });
  };

  const onBpmSave = (value: string): void => {
    if (!value) {
      save.mutate({ bpm: 0 });

      return;
    }

    save.mutate({ bpm: Number(value) });
  };

  const onKeyChange = (key: string): void => {
    save.mutate({ key });
  };

  return { onStatusSelect, onBpmSave, onKeyChange };
}
