import type { ChangeEvent } from 'react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Song } from '@/entities/song';
import { getMainCover } from '@/entities/song';
import {
  queryKeys,
  sendRecordForm,
  Collections,
  getCollection,
  pb,
} from '@/shared/api';
import { SAVE_FAILED, MAX_IMAGE_BYTES, MAX_COVERS } from '@/shared/constants';
import { useFileUrl } from '@/shared/hooks';
import { shrinkImages, warmImages, getFileSizeLabel } from '@/shared/utils';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  PERCENT,
  COVERS_APPEND_FIELD,
  COVER_THUMB_LARGE,
  COVER_THUMB_SMALL,
  COVERS_REMOVE_FIELD,
} from '../constants/song-edit';
import type { UseCoversResult, CoversPatch } from '../types/song-edit';

/** Доля в процентах; без загрузки - null */
function getPercent(fraction: number | null): number | null {
  if (fraction === null) {
    return null;
  }

  return Math.round(fraction * PERCENT);
}

/** Загрузка, выбор основной, просмотр и удаление обложек */
export function useCovers(song: Song): UseCoversResult {
  const client = useQueryClient();
  const fileUrl = useFileUrl();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [viewingCover, setViewingCover] = useState<string | null>(null);
  // какую обложку удалить - после подтверждения
  const [removingCover, setRemovingCover] = useState<string | null>(null);
  const covers = song.covers ?? [];
  const mainCover = getMainCover(song);

  const handleRefresh = (): Promise<void> =>
    client.invalidateQueries({ queryKey: queryKeys.songs.all });

  const upload = useMutation({
    mutationFn: async (files: File[]): Promise<void> => {
      setProgress(0);
      const shrunkFiles = await shrinkImages(files);
      const form = new FormData();
      for (const shrunkFile of shrunkFiles) {
        form.append(COVERS_APPEND_FIELD, shrunkFile);
      }
      const next = await sendRecordForm<Song>(Collections.Songs, form, {
        id: song.id,
        onProgress: setProgress,
      });
      const added = next.covers.filter((cover) => !covers.includes(cover));
      await warmImages([
        ...added.map((cover) => fileUrl(next, cover, COVER_THUMB_LARGE)),
        fileUrl(next, getMainCover(next), COVER_THUMB_SMALL),
      ]);
    },
    onSettled: () => {
      setProgress(null);
    },
    onSuccess: handleRefresh,
    onError: () => {
      toast.error(
        'Обложка не загрузилась: проверьте соединение и размер файла'
      );
    },
  });

  const update = useMutation({
    mutationFn: (patch: CoversPatch): Promise<Song> =>
      getCollection(pb, Collections.Songs).update(song.id, patch),
    onSuccess: handleRefresh,
    onError: () => {
      toast.error(SAVE_FAILED);
    },
  });

  const onFilesPick = (files: File[]): void => {
    const fittingFiles = files.filter((file) => file.size <= MAX_IMAGE_BYTES);

    if (fittingFiles.length < files.length) {
      toast.error(
        `Обложка больше ${getFileSizeLabel(MAX_IMAGE_BYTES)} не загрузится`
      );
    }

    const freeSlots = MAX_COVERS - covers.length;

    if (fittingFiles.length > freeSlots) {
      toast.error(`Не больше ${MAX_COVERS} обложек`);
    }

    const hasFiles = fittingFiles.length > 0;
    const hasRoom = freeSlots > 0;

    if (hasFiles && hasRoom) {
      upload.mutate(fittingFiles.slice(0, freeSlots));
    }
  };

  const isBusy = upload.isPending || update.isPending;
  const isFull = covers.length >= MAX_COVERS;
  const isAddDisabled = isBusy || isFull;

  const getCoverUrl = (cover: string): string | undefined =>
    fileUrl(song, cover, COVER_THUMB_LARGE);

  const onCoverView = (cover: string): void => {
    setViewingCover(cover);
  };

  const onCoverMakeMain = (cover: string): void => {
    update.mutate({ main_cover: cover });
  };

  const onCoverRemove = (cover: string): void => {
    setRemovingCover(cover);
  };

  const onAddClick = (): void => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onFilesChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onFilesPick(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const onRemoveOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      setRemovingCover(null);
    }
  };

  const onRemoveConfirm = (): void => {
    if (removingCover === null) {
      return;
    }

    const patch: CoversPatch = { [COVERS_REMOVE_FIELD]: removingCover };

    if (removingCover === mainCover) {
      patch.main_cover = '';
    }

    update.mutate(patch, {
      onSuccess: () => {
        setRemovingCover(null);
      },
    });
  };

  const onViewerClose = (): void => {
    setViewingCover(null);
  };

  let viewerSrc: string | undefined;
  let viewerDownloadUrl: string | undefined;

  if (viewingCover) {
    viewerSrc = fileUrl(song, viewingCover);
    viewerDownloadUrl = fileUrl(song, viewingCover, undefined, true);
  }

  return {
    covers,
    mainCover,
    getCoverUrl,
    fileInputRef,
    uploadPercent: getPercent(progress),
    isBusy,
    isAddDisabled,
    isUpdating: update.isPending,
    isRemoveOpen: removingCover !== null,
    viewerSrc,
    viewerDownloadUrl,
    onCoverView,
    onCoverMakeMain,
    onCoverRemove,
    onAddClick,
    onFilesPick,
    onFilesChange,
    onRemoveOpenChange,
    onRemoveConfirm,
    onViewerClose,
  };
}
