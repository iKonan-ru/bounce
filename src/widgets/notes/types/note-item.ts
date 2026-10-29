import type { Note, Picture, Attachment } from '@/entities/note';
import type { Abilities } from '@/entities/project';
import type { Song } from '@/entities/song';
import type { User } from '@/entities/user';
import type { useFileUrl } from '@/shared/hooks';

/** Какое окно заметки открыто */
export enum NoteDialog {
  /** Окна закрыты */
  None = 'none',
  /** Подтверждение удаления */
  Delete = 'delete',
  /** "Сделать песней" */
  Song = 'song',
}

/** Адрес файла записи: из useFileUrl */
export type FileUrlGetter = ReturnType<typeof useFileUrl>;

/** Картинка в просмотре на весь экран; без картинки окно закрыто */
export interface ImageView {
  src: string | undefined;
  title: string;
  downloadUrl: string | undefined;
}

/** Пропсы ссылки "откуда заметка" */
export interface OriginProps {
  note: Note;
}

/** Пропсы плеера аудио заметки */
export interface NoteAudioPlayerProps {
  note: Note;
  fileName: string;
  /** Номер файла в заметке: по нему берётся исходное имя файла */
  index: number;
}

/** Пропсы ссылки на песню, которой стала заметка */
export interface BecameSongLinkProps {
  projectId: string;
  song: Song;
}

/** Пропсы заметки в ленте */
export interface NoteItemProps {
  note: Note;
  /** Показывать, откуда заметка: проект, песня или этап */
  showOrigin: boolean;
  access: Abilities;
  meId: string | undefined;
}

/** Состояние и обработчики заметки в ленте */
export interface UseNoteItemResult {
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
