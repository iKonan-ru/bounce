import type { ChangeEvent } from 'react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Song } from '@/entities/song';
import {
  getSongStatus,
  SongStatus,
  getReleaseMissing,
  getReleaseCoverProblem,
  getMainCover,
} from '@/entities/song';
import {
  queryKeys,
  getCollection,
  pb,
  Collections,
  getErrorText,
  sendRecordForm,
} from '@/shared/api';
import { SAVE_FAILED, MAX_COVERS } from '@/shared/constants';
import { useFileUrl } from '@/shared/hooks';
import {
  getSafeUrl,
  shrinkImage,
  warmImages,
  getDateLabel,
} from '@/shared/utils';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  RELEASE_COVER_FIELD,
  COVERS_APPEND_FIELD,
  COVER_THUMB,
  SMALL_COVER_THUMB,
  PERCENT,
} from '../constants/release-section';
import type {
  ReleaseSectionProps,
  UseReleaseSectionResult,
  ReleasePatch,
} from '../types/release-section';
import { FileProblem } from '../utils/release-section';

/** Данные, правки и загрузка обложки блока релиза */
export function useReleaseSection({
  song,
  isEditable,
}: Pick<ReleaseSectionProps, 'song' | 'isEditable'>): UseReleaseSectionResult {
  const client = useQueryClient();
  const fileUrl = useFileUrl();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const status = getSongStatus(song);
  const isOnLabel = status === SongStatus.sent;
  const isReleased = status === SongStatus.released;
  const isSent = isOnLabel || isReleased;
  const missing = getReleaseMissing(song);
  // только http(s): адрес приходит из записи, а не из формы
  const bandlinkHref = getSafeUrl(song.bandlink ?? '') ?? undefined;
  const refreshSongs = (): Promise<void> =>
    client.invalidateQueries({ queryKey: queryKeys.songs.all });

  const save = useMutation({
    mutationFn: (patch: ReleasePatch) =>
      getCollection(pb, Collections.Songs).update(song.id, patch),
    onSettled: refreshSongs,
    onError: (error) => toast.error(getErrorText(error, SAVE_FAILED)),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const problem = await getReleaseCoverProblem(file);

      if (problem) {
        throw new FileProblem(problem);
      }

      const form = new FormData();
      // обложка для релиза хранится как есть, а её копия попадает в галерею обложек песни -
      // уменьшенной, как все обложки галереи; галерея полна - копии нет
      form.set(RELEASE_COVER_FIELD, file);
      const covers = song.covers ?? [];

      if (covers.length < MAX_COVERS) {
        form.append(COVERS_APPEND_FIELD, await shrinkImage(file));
      }

      setProgress(0);
      const next = await sendRecordForm<Song>(Collections.Songs, form, {
        id: song.id,
        onProgress: setProgress,
      });
      const added = (next.covers ?? []).filter(
        (cover) => !covers.includes(cover)
      );
      await warmImages([
        ...added.map((cover) => fileUrl(next, cover, COVER_THUMB)),
        fileUrl(next, getMainCover(next), SMALL_COVER_THUMB),
      ]);

      return next;
    },
    onSettled: () => setProgress(null),
    onSuccess: refreshSongs,
    onError: (error) => {
      if (error instanceof FileProblem) {
        toast.error(error.message);

        return;
      }

      toast.error('Обложка не загрузилась: проверьте соединение');
    },
  });

  const pickCover = (file: File): void => {
    upload.mutate(file);
  };
  const onReleaseDateChange = (targetRelease: string): void => {
    save.mutate({ target_release: targetRelease });
  };
  const onCoverUploadClick = (): void => {
    if (coverInputRef.current) {
      coverInputRef.current.click();
    }
  };
  const onCoverInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const pickedFile = event.target.files?.[0];

    if (pickedFile) {
      pickCover(pickedFile);
    }

    event.target.value = '';
  };
  const onBandlinkSave = (bandlink: string): void => {
    save.mutate({ bandlink });
  };
  const onSendClick = (): void => {
    save.mutate({ status: SongStatus.sent });
  };
  const onCancelSendClick = (): void => {
    save.mutate({ status: SongStatus.done });
  };

  let releaseDateLabel = 'Не выбрана';

  if (song.target_release) {
    releaseDateLabel = getDateLabel(song.target_release);
  }

  const releaseCover = song.release_cover || undefined;
  const hasMissing = missing.length > 0;
  let sendNote = 'Всё готово к отправке';

  if (hasMissing) {
    sendNote = `Для отправки на лейбл нужны: ${missing.join(', ')}`;
  }

  let releasePlanNote = 'Укажите дату релиза: в этот день песня будет выпущена';
  let releasedDateSuffix = '';

  if (song.target_release) {
    releasePlanNote = `Будет выпущена ${getDateLabel(song.target_release)}`;
    releasedDateSuffix = ` ${getDateLabel(song.target_release)}`;
  }

  let coverProgressPercent = 0;

  if (progress !== null) {
    coverProgressPercent = Math.round(progress * PERCENT);
  }

  const coverActionLabel = song.release_cover ? 'Заменить' : 'Загрузить';
  const coverMissingNote = song.release_cover ? '' : ', не загружена';
  const isSendDisabled = hasMissing || save.isPending;

  return {
    coverInputRef,
    isSent,
    isOnLabel,
    isReleased,
    targetRelease: song.target_release ?? '',
    releaseDateLabel,
    releaseCover,
    coverTitle: `${song.title}: обложка для релиза`,
    coverMissingNote,
    coverDownloadUrl: fileUrl(song, song.release_cover, undefined, true),
    coverActionLabel,
    canUploadCover: !isSent && isEditable,
    isCoverUploadPending: upload.isPending,
    isCoverUploading: progress !== null,
    coverProgressPercent,
    hasLyrics: Boolean((song.lyrics ?? '').trim()),
    bandlinkHref,
    bandlinkValue: song.bandlink ?? '',
    showBandlinkLink: isSent && !isEditable && Boolean(bandlinkHref),
    canEditBandlink: isSent && isEditable,
    showNotSentNote: !isSent && !isEditable,
    canSend: !isSent && isEditable,
    sendNote,
    hasMissing,
    isSendDisabled,
    isSavePending: save.isPending,
    releasePlanNote,
    releasedDateSuffix,
    onCoverPick: isEditable ? pickCover : undefined,
    onReleaseDateChange,
    onCoverUploadClick,
    onCoverInputChange,
    onBandlinkSave,
    onSendClick,
    onCancelSendClick,
  };
}
