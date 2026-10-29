import { useState } from 'react';
import { toast } from 'sonner';
import type { Note } from '@/entities/note';
import type { Song } from '@/entities/song';
import { songsQuery } from '@/entities/song';
import { getCollection, pb, Collections, queryKeys } from '@/shared/api';
import { useFileUrl } from '@/shared/hooks';
import { getDisplayFileName, getNoteDateLabel } from '@/shared/utils';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { IMAGE_THUMB_SIZE } from '../constants/note-item';
import type {
  FileUrlGetter,
  ImageView,
  NoteItemProps,
  UseNoteItemResult,
} from '../types/note-item';
import { NoteDialog } from '../types/note-item';
import { NoteAudioPlayer } from '../ui/note-audio-player';

/** Песня, которой стала заметка; пока песни не загружены - нет */
function findBecameSong(
  note: Note,
  songs: readonly Song[] | undefined
): Song | undefined {
  if (!note.became_song) {
    return undefined;
  }

  return songs?.find((song) => song.id === note.became_song);
}

/** Что показать в просмотре картинки заметки */
function getImageView(
  note: Note,
  fileName: string | undefined,
  getFileUrl: FileUrlGetter
): ImageView {
  if (!fileName) {
    return { src: undefined, title: 'Картинка', downloadUrl: undefined };
  }

  return {
    src: getFileUrl(note, fileName),
    title: getDisplayFileName(fileName),
    downloadUrl: getFileUrl(note, fileName, undefined, true),
  };
}

/** Логика заметки в ленте: права, вложения, окна, правка и удаление */
export function useNoteItem({
  note,
  access,
  meId,
}: Omit<NoteItemProps, 'showOrigin'>): UseNoteItemResult {
  const client = useQueryClient();
  const getFileUrl = useFileUrl();
  const songs = useQuery({
    ...songsQuery(note.project),
    enabled: Boolean(note.became_song),
  });
  const [openDialog, setOpenDialog] = useState<NoteDialog>(NoteDialog.None);
  const [isEditing, setIsEditing] = useState(false);
  const [viewedImage, setViewedImage] = useState<string>();
  // свою заметку правит автор, пока он в проекте не наблюдатель; удалить чужую может редактор
  const isMine = meId === note.author && access.canWork;
  const canDelete = isMine || access.canEdit;
  const author = note.expand?.author;
  const authorName = author?.name ?? 'Участник';
  const dateLabel = getNoteDateLabel(note.created);
  const becameSong = findBecameSong(note, songs.data);
  // песней становится заметка самого проекта, ещё не ставшая песней; создаёт песни редактор
  const canMakeSong = !note.song && !note.became_song && access.canEdit;

  const remove = useMutation({
    mutationFn: () => getCollection(pb, Collections.Notes).delete(note.id),
    onSuccess: async () => {
      setOpenDialog(NoteDialog.None);
      await client.invalidateQueries({ queryKey: queryKeys.notes.all });
    },
    onError: () => {
      toast.error('Заметка не удалена: проверьте соединение');
    },
  });
  const isBusy = remove.isPending;
  const hasMenu = isMine || canDelete || canMakeSong;
  const isDeleteDialogOpen = openDialog === NoteDialog.Delete;
  const isSongDialogOpen = openDialog === NoteDialog.Song;

  const createOnImageOpen =
    (fileName: string): (() => void) =>
    (): void => {
      setViewedImage(fileName);
    };
  const images = (note.images ?? []).map((fileName) => {
    const thumbUrl = getFileUrl(note, fileName, IMAGE_THUMB_SIZE);
    const open = {
      label: `Открыть ${getDisplayFileName(fileName)}`,
      onClick: createOnImageOpen(fileName),
    };
    const content = thumbUrl && (
      <img
        src={thumbUrl}
        alt=""
        loading="lazy"
        className="size-full object-cover"
      />
    );

    return { key: fileName, open, content };
  });
  const audio = (note.audio ?? []).map((fileName, index) => ({
    key: fileName,
    content: <NoteAudioPlayer note={note} fileName={fileName} index={index} />,
  }));
  const imageView = getImageView(note, viewedImage, getFileUrl);

  const onMakeSongSelect = (): void => {
    setOpenDialog(NoteDialog.Song);
  };
  const onEditSelect = (): void => {
    setIsEditing(true);
  };
  const onDeleteSelect = (): void => {
    setOpenDialog(NoteDialog.Delete);
  };
  const onEditDone = (): void => {
    setIsEditing(false);
  };
  const onViewerClose = (): void => {
    setViewedImage(undefined);
  };
  const onDeleteDialogOpenChange = (isOpen: boolean): void => {
    const nextDialog = isOpen ? NoteDialog.Delete : NoteDialog.None;
    setOpenDialog(nextDialog);
  };
  const onDeleteConfirm = (): void => {
    remove.mutate();
  };
  const onSongDialogClose = (): void => {
    setOpenDialog(NoteDialog.None);
  };

  return {
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
  };
}
