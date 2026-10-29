import type { RefObject, ReactNode, ChangeEvent, KeyboardEvent } from 'react';
import type { Post, PostAnchor, PostStatus } from '@/entities/post';
import type { Song } from '@/entities/song';

/** Вариант выбора: значение и подпись */
export interface ChoiceOption<Value extends string> {
  value: Value;
  label: string;
}

/** Вариант выбора песни */
export interface SongOption extends ChoiceOption<string> {
  /** Отделён чертой от вариантов выше */
  separated?: boolean;
}

/** Пропсы окна публикации */
export interface PostDialogProps {
  post: Post;
  canWork: boolean;
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** Состояние и обработчики окна публикации */
export interface UsePostDialogResult {
  song: Song | undefined;
  songValue: string;
  songOptions: SongOption[];
  platforms: string[];
  assignees: string[];
  /** Дата публикации, если она своя (не от релиза) */
  postDate: string;
  /** Дата публикации от релиза словами или "нет даты релиза" */
  releaseDateText: string;
  releaseDateClassName: string;
  /** Дата считается от релиза песни */
  isFromRelease: boolean;
  anchorValue: PostAnchor;
  offsetLabel: string;
  isEarlierDisabled: boolean;
  isLaterDisabled: boolean;
  isDeleting: boolean;
  textRef: RefObject<HTMLTextAreaElement | null>;
  text: string;
  /** Список упоминаний под полем текста */
  mentionsMenu: ReactNode;
  onTitleCommit: (title: string) => void;
  onStatusChange: (status: PostStatus) => void;
  onPlatformToggle: (id: string, isSelected: boolean) => void;
  onSongChange: (songId: string) => void;
  onAnchorChange: (anchor: PostAnchor) => void;
  onEarlierClick: () => void;
  onLaterClick: () => void;
  onDateChange: (date: string) => void;
  onAssigneesChange: (assignees: string[]) => void;
  onTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onTextSelect: () => void;
  onTextFocus: () => void;
  onTextBlur: () => void;
  onTextKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onDeleteClick: () => void;
  onDoneClick: () => void;
}
