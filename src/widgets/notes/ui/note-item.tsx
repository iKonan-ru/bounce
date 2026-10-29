import { Disc3, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { NoteAttachments, AudioView } from '@/entities/note';
import { MakeSongDialog } from '@/features/create-song';
import { Markup } from '@/features/markup';
import {
  Avatar,
  DropdownMenu,
  DropdownMenuTrigger,
  Button,
  DropdownMenuContent,
  DropdownMenuItem,
  ImageViewer,
  ConfirmDialog,
} from '@/shared/ui';
import { Link } from '@tanstack/react-router';
import { useNoteItem } from '../hooks/use-note-item';
import type { BecameSongLinkProps, NoteItemProps } from '../types/note-item';
import { NoteEditForm } from './note-edit-form';
import { Origin } from './origin';

/** Ссылка на песню, которой стала заметка */
function BecameSongLink({ projectId, song }: BecameSongLinkProps): ReactNode {
  const songParams = { projectId, songId: song.id };

  return (
    <Link
      to="/p/$projectId/songs/$songId"
      params={songParams}
      className="mt-1 ml-[2.375rem] flex min-h-9 items-center gap-2 text-sm text-led-green"
    >
      <Disc3 className="size-4" />
      Стала песней: {song.title}
    </Link>
  );
}

/** Заметка в ленте: автор, когда, откуда; текст, картинки, аудио; правка, удаление, "Сделать песней" */
export function NoteItem({
  note,
  showOrigin,
  access,
  meId,
}: NoteItemProps): ReactNode {
  const {
    author,
    authorName,
    dateLabel,
    isMine,
    canDelete,
    canMakeSong,
    hasMenu,
    isBusy,
    isEditing,
    isDeleteDialogOpen,
    isSongDialogOpen,
    becameSong,
    images,
    audio,
    imageView,
    onMakeSongSelect,
    onEditSelect,
    onDeleteSelect,
    onEditDone,
    onViewerClose,
    onDeleteDialogOpenChange,
    onDeleteConfirm,
    onSongDialogClose,
  } = useNoteItem({ note, access, meId });
  const editForm = <NoteEditForm note={note} onDone={onEditDone} />;
  const noteText = note.text && (
    <Markup text={note.text} className="mt-1.5 pl-[2.375rem]" />
  );

  return (
    <article className="group/note px-4 py-3">
      <header className="flex items-center gap-2.5">
        <Avatar user={author} className="size-7 text-xs" />
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="truncate text-sm font-medium">{authorName}</span>
          <span className="shrink-0 text-xs text-dim">{dateLabel}</span>
          {showOrigin && <Origin note={note} />}
        </div>
        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Действия с заметкой"
                disabled={isBusy}
                className="-mr-1.5 text-dim [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/note:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:aria-expanded:opacity-100"
              >
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canMakeSong && (
                <DropdownMenuItem onSelect={onMakeSongSelect}>
                  <Disc3 />
                  Сделать песней
                </DropdownMenuItem>
              )}
              {isMine && (
                <DropdownMenuItem onSelect={onEditSelect}>
                  <Pencil />
                  Изменить текст
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={onDeleteSelect}
                >
                  <Trash2 />
                  Удалить
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {isEditing ? editForm : noteText}

      <NoteAttachments
        images={images}
        audio={audio}
        audioView={AudioView.Players}
        className="pl-[2.375rem]"
      />

      {becameSong && (
        <BecameSongLink projectId={note.project} song={becameSong} />
      )}

      <ImageViewer
        src={imageView.src}
        title={imageView.title}
        downloadUrl={imageView.downloadUrl}
        onClose={onViewerClose}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={onDeleteDialogOpenChange}
        title="Удалить заметку?"
        description="Вместе с ней удалятся приложенные файлы."
        confirmLabel="Удалить"
        isBusy={isBusy}
        onConfirm={onDeleteConfirm}
      />
      {isSongDialogOpen && (
        <MakeSongDialog note={note} onClose={onSongDialogClose} />
      )}
    </article>
  );
}
