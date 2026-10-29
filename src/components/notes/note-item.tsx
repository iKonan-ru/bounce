import { Disc3, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { AudioPlayer } from '@/components/audio-player';
import { Avatar } from '@/components/avatar';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ImageViewer } from '@/components/image-viewer';
import { Markup } from '@/components/markup';
import {
  type Attachment,
  NoteAttachments,
  type Picture,
} from '@/components/notes/attachments';
import { MakeSongDialog } from '@/components/notes/make-song-dialog';
import { NoteEditForm } from '@/components/notes/note-edit-form';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFileUrl } from '@/hooks/use-file-url';
import { getDisplayFileName, getNoteDateLabel } from '@/lib/format';
import type { Note, Song, User } from '@/lib/model';
import { AudioView } from '@/lib/notes';
import { Collections, getCollection, pb } from '@/lib/pb';
import { songsQuery } from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import type { Abilities } from '@/lib/roles';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';

/** Классы ссылки "откуда заметка" */
const ORIGIN_LINK_CLASS = 'truncate text-xs text-dim hover:text-ink';

/** Размер превью картинки заметки (параметр thumb PocketBase) */
const IMAGE_THUMB_SIZE = '480x0';

/** Какое окно заметки открыто */
enum NoteDialog {
  /** Окна закрыты */
  None = 'none',
  /** Подтверждение удаления */
  Delete = 'delete',
  /** "Сделать песней" */
  Song = 'song',
}

/** Адрес файла записи: из useFileUrl */
type FileUrlGetter = ReturnType<typeof useFileUrl>;

/** Картинка в просмотре на весь экран; без картинки окно закрыто */
interface ImageView {
  src: string | undefined;
  title: string;
  downloadUrl: string | undefined;
}

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

/** Пропсы ссылки "откуда заметка" */
interface OriginProps {
  note: Note;
}

/** Откуда заметка: проект, песня или этап песни */
function Origin({ note }: OriginProps): ReactNode {
  const song = note.expand?.song;
  const stage = note.expand?.stage;

  if (!song) {
    const projectParams = { projectId: note.project };

    return (
      <Link
        to="/p/$projectId"
        params={projectParams}
        className={ORIGIN_LINK_CLASS}
      >
        Проект
      </Link>
    );
  }

  if (!stage) {
    const songParams = { projectId: note.project, songId: song.id };

    return (
      <Link
        to="/p/$projectId/songs/$songId"
        params={songParams}
        className={ORIGIN_LINK_CLASS}
      >
        {song.title}
      </Link>
    );
  }

  const stageParams = {
    projectId: note.project,
    songId: song.id,
    stageId: stage.id,
  };

  return (
    <Link
      to="/p/$projectId/songs/$songId/stages/$stageId"
      params={stageParams}
      className={ORIGIN_LINK_CLASS}
    >
      {song.title} · {stage.title}
    </Link>
  );
}

/** Пропсы плеера аудио заметки */
interface NoteAudioPlayerProps {
  note: Note;
  fileName: string;
  /** Номер файла в заметке: по нему берётся исходное имя файла */
  index: number;
}

/** Плеер аудио заметки: имя - как у файла на диске автора, иначе имя на сервере */
function NoteAudioPlayer({
  note,
  fileName,
  index,
}: NoteAudioPlayerProps): ReactNode {
  const name = note.audio_names?.[index] || getDisplayFileName(fileName);

  return (
    <AudioPlayer
      record={note}
      file={fileName}
      name={name}
      // для системы, что играет: теги MP3, иначе имя файла
      shouldReadTags
    />
  );
}

/** Пропсы ссылки на песню, которой стала заметка */
interface BecameSongLinkProps {
  projectId: string;
  song: Song;
}

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

/** Пропсы заметки в ленте */
interface NoteItemProps {
  note: Note;
  /** Показывать, откуда заметка: проект, песня или этап */
  showOrigin: boolean;
  access: Abilities;
  meId: string | undefined;
}

/** Состояние и обработчики заметки в ленте */
interface UseNoteItemResult {
  author: User | undefined;
  authorName: string;
  dateLabel: string;
  /** Своя заметка: её текст можно править */
  isMine: boolean;
  canDelete: boolean;
  canMakeSong: boolean;
  hasMenu: boolean;
  isBusy: boolean;
  isEditing: boolean;
  isDeleteDialogOpen: boolean;
  isSongDialogOpen: boolean;
  becameSong: Song | undefined;
  images: Picture[];
  audio: Attachment[];
  imageView: ImageView;
  onMakeSongSelect: () => void;
  onEditSelect: () => void;
  onDeleteSelect: () => void;
  onEditDone: () => void;
  onViewerClose: () => void;
  onDeleteDialogOpenChange: (isOpen: boolean) => void;
  onDeleteConfirm: () => void;
  onSongDialogClose: () => void;
}

/** Логика заметки в ленте: права, вложения, окна, правка и удаление */
function useNoteItem({
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
