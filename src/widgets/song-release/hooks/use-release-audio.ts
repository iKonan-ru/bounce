import type { ChangeEvent } from 'react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { projectQuery } from '@/entities/project';
import type { Song } from '@/entities/song';
import { getMainCover } from '@/entities/song';
import type { AudioMeta } from '@/features/player';
import {
  queryKeys,
  sendRecordForm,
  Collections,
  getCollection,
  pb,
} from '@/shared/api';
import { MAX_RELEASE_AUDIO_BYTES, SAVE_FAILED } from '@/shared/constants';
import { useFileUrl } from '@/shared/hooks';
import { getFileSizeLabel, getDisplayFileName } from '@/shared/utils';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import {
  RELEASE_AUDIO_TYPE_RE,
  RELEASE_AUDIO_EXTENSION_RE,
  RELEASE_AUDIO_FIELD,
  RELEASE_AUDIO_NAME_FIELD,
  RELEASE_AUDIO_NAME_MAX,
  CLEARED_RELEASE_AUDIO,
  PERCENT,
  COVER_THUMB,
} from '../constants/release-section';
import type {
  ReleaseAudioProps,
  UseReleaseAudioResult,
} from '../types/release-section';
import { FileProblem } from '../utils/release-section';

/** WAV или MP3: по типу, а если браузер его не назвал - по расширению */
function checkIsReleaseAudio(file: File): boolean {
  const isAudioType = RELEASE_AUDIO_TYPE_RE.test(file.type);
  const hasAudioExtension = RELEASE_AUDIO_EXTENSION_RE.test(file.name);

  return isAudioType || hasAudioExtension;
}

/** Загрузка, замена и удаление финальной версии трека */
export function useReleaseAudio({
  song,
  isEditable,
  isSent,
}: ReleaseAudioProps): UseReleaseAudioResult {
  const client = useQueryClient();
  const fileUrl = useFileUrl();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const project = useQuery(projectQuery(song.project));
  const file = song.release_audio || undefined;
  const refreshSongs = (): Promise<void> =>
    client.invalidateQueries({ queryKey: queryKeys.songs.all });

  const upload = useMutation({
    mutationFn: (audioFile: File) => {
      if (!checkIsReleaseAudio(audioFile)) {
        throw new FileProblem('Нужен файл WAV или MP3');
      }

      if (audioFile.size > MAX_RELEASE_AUDIO_BYTES) {
        throw new FileProblem(
          `Файл больше ${getFileSizeLabel(MAX_RELEASE_AUDIO_BYTES)} не загрузится`
        );
      }

      const form = new FormData();
      form.set(RELEASE_AUDIO_FIELD, audioFile);
      form.set(
        RELEASE_AUDIO_NAME_FIELD,
        audioFile.name.slice(0, RELEASE_AUDIO_NAME_MAX)
      );
      setProgress(0);

      return sendRecordForm<Song>(Collections.Songs, form, {
        id: song.id,
        onProgress: setProgress,
      });
    },
    onSettled: () => setProgress(null),
    onSuccess: refreshSongs,
    onError: (error) => {
      if (error instanceof FileProblem) {
        toast.error(error.message);

        return;
      }

      toast.error('Трек не загрузился: проверьте соединение');
    },
  });
  const remove = useMutation({
    mutationFn: () =>
      getCollection(pb, Collections.Songs).update(
        song.id,
        CLEARED_RELEASE_AUDIO
      ),
    onSuccess: async () => {
      setIsRemoving(false);
      await refreshSongs();
    },
    onError: () => toast.error(SAVE_FAILED),
  });

  const onAudioUploadClick = (): void => {
    if (audioInputRef.current) {
      audioInputRef.current.click();
    }
  };
  const onFilesDrop = (files: File[]): void => {
    const file = files[0];

    if (file) {
      upload.mutate(file);
    }
  };
  const onAudioInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const pickedFile = event.target.files?.[0];

    if (pickedFile) {
      upload.mutate(pickedFile);
    }

    event.target.value = '';
  };
  const onRemoveClick = (): void => {
    setIsRemoving(true);
  };
  const onRemoveConfirm = (): void => {
    remove.mutate();
  };

  let name = song.release_audio_name || '';

  if (!name) {
    // без сохранённого имени - имя файла на сервере без приписки PocketBase
    if (file) {
      name = getDisplayFileName(file);
    }
  }

  let progressPercent = 0;

  if (progress !== null) {
    progressPercent = Math.round(progress * PERCENT);
  }

  const isUploading = progress !== null;
  // загруженный трек - плеер; пока идёт загрузка, вместо плеера полоска хода
  let playerFile: string | undefined;

  if (!isUploading) {
    playerFile = file;
  }

  const canRemove = isEditable && !isSent;
  // обложка для системы: обложка для релиза, а без неё - основная
  let artwork = fileUrl(song, getMainCover(song), COVER_THUMB);

  if (song.release_cover) {
    artwork = fileUrl(song, song.release_cover, COVER_THUMB);
  }

  const audioMeta: AudioMeta = {
    artist: project.data?.name,
    album: song.title,
    artwork,
  };

  return {
    audioInputRef,
    file,
    name,
    isHidden: !file && !isEditable,
    isUploadPending: upload.isPending,
    isUploading,
    progressPercent,
    playerFile,
    audioMeta,
    isRemoving,
    setIsRemoving,
    isRemovePending: remove.isPending,
    onReplace: isEditable ? onAudioUploadClick : undefined,
    onRemove: canRemove ? onRemoveClick : undefined,
    onAudioUploadClick,
    onFilesDrop,
    onAudioInputChange,
    onRemoveConfirm,
  };
}
