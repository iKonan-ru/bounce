import { CloudOff, Trash2, Eye, EyeOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { NoteAttachments, AudioView, NoteVisibility } from '@/entities/note';
import { Markup } from '@/features/markup';
import { Button, ConfirmDialog } from '@/shared/ui';
import { usePendingItem } from '../hooks/use-pending-item';
import type { PendingItemProps } from '../types/pending-item';

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

  const isRestricted =
    Boolean(note.visibility) && note.visibility !== NoteVisibility.project;

  const VisibilityIcon =
    note.visibility === NoteVisibility.private ? EyeOff : Eye;
  const visibilityLabel =
    note.visibility === NoteVisibility.private ? 'Только мне' : 'Для выбранных';

  return (
    <article className="px-4 py-3">
      <header className="flex items-center gap-2">
        <CloudOff className={statusIconClassName} />
        <p className={statusClassName}>{statusText}</p>
        {isRestricted && (
          <span title={visibilityLabel} role="img" aria-label={visibilityLabel}>
            <VisibilityIcon className="size-3.5 text-dim" />
          </span>
        )}
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
