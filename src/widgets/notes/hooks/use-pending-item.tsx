import { useState } from 'react';
import type { PendingNote } from '@/entities/note';
import { LocalImage, dropPending } from '@/entities/note';
import { cn, getFileKey } from '@/shared/utils';
import type { UsePendingItemResult } from '../types/pending-item';
import { PendingAudioName } from '../ui/pending-audio-name';

/** Логика ждущей отправки заметки: статус, вложения и удаление черновика */
export function usePendingItem(note: PendingNote): UsePendingItemResult {
  const [isConfirming, setIsConfirming] = useState(false);
  const isRejected = note.rejected === true;
  const statusIconClassName = cn('size-4', {
    'text-led-red': isRejected,
    'text-led-amber': !isRejected,
  });
  const statusClassName = cn('flex-1 text-sm', {
    'text-led-red': isRejected,
    'text-dim': !isRejected,
  });
  const statusText = isRejected ? 'Сервер не принял заметку' : 'Ждёт отправки';
  const images = note.images.map((file) => ({
    key: getFileKey(file),
    content: <LocalImage file={file} />,
  }));
  const audio = note.audio.map((file) => ({
    key: getFileKey(file),
    content: <PendingAudioName file={file} />,
  }));
  const onDeleteClick = (): void => {
    setIsConfirming(true);
  };
  const onDeleteConfirm = (): void => {
    setIsConfirming(false);
    void dropPending(note.id);
  };

  return {
    isConfirming,
    setIsConfirming,
    statusIconClassName,
    statusClassName,
    statusText,
    images,
    audio,
    onDeleteClick,
    onDeleteConfirm,
  };
}
