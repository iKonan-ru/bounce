import { Mic, CloudOff, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { PendingNote, Picture, Attachment } from '@/entities/note';
import {
  LocalImage,
  dropPending,
  NoteAttachments,
  AudioView,
} from '@/entities/note';
import { Markup } from '@/features/markup';
import { Button, ConfirmDialog } from '@/shared/ui';
import { cn, getFileKey } from '@/shared/utils';

/** Пропсы ждущей отправки заметки */
interface PendingItemProps {
  note: PendingNote;
}

/** Состояние и обработчики ждущей отправки заметки */
interface UsePendingItemResult {
  /** Открыто подтверждение удаления */
  isConfirming: boolean;
  setIsConfirming: (isConfirming: boolean) => void;
  statusIconClassName: string;
  statusClassName: string;
  statusText: string;
  images: Picture[];
  audio: Attachment[];
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
}

/** Пропсы имени аудиофайла в очереди */
interface PendingAudioNameProps {
  file: File;
}

/** Имя аудиофайла заметки в очереди */
function PendingAudioName({ file }: PendingAudioNameProps): ReactNode {
  return (
    <>
      <Mic className="size-3.5 text-dim" />
      {file.name}
    </>
  );
}

/** Логика ждущей отправки заметки: статус, вложения и удаление черновика */
function usePendingItem(note: PendingNote): UsePendingItemResult {
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

/** Заметка, которая ждёт отправки в очереди на устройстве (или которую сервер не принял) */
export function PendingItem({ note }: PendingItemProps): ReactNode {
  const {
    isConfirming,
    setIsConfirming,
    statusIconClassName,
    statusClassName,
    statusText,
    images,
    audio,
    onDeleteClick,
    onDeleteConfirm,
  } = usePendingItem(note);

  return (
    <article className="px-4 py-3">
      <header className="flex items-center gap-2">
        <CloudOff className={statusIconClassName} />
        <p className={statusClassName}>{statusText}</p>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Удалить черновик"
          onClick={onDeleteClick}
        >
          <Trash2 />
        </Button>
      </header>
      {note.text && <Markup text={note.text} className="mt-2" />}
      <NoteAttachments
        images={images}
        audio={audio}
        audioView={AudioView.Names}
      />
      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        title="Удалить черновик?"
        confirmLabel="Удалить"
        onConfirm={onDeleteConfirm}
      />
    </article>
  );
}
