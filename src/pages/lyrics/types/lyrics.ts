import type { RefObject, FormEvent, ChangeEvent } from 'react';
import type { SongWithStages, LyricsPart } from '@/entities/song';
import type { Crumb } from '@/shared/types';
import type { UseQueryResult } from '@tanstack/react-query';

/**
 * Недописанная правка текста
 *
 * Переживает уход со страницы и закрытие приложения: она лежит на устройстве, пока её не сохранят
 * или не отбросят. Вместе с ней - чья она и с какого текста её начали (base): если текст с тех
 * пор изменили на сервере, человек увидит это до сохранения, а не затрёт чужую правку молча.
 * Выход из приложения стирает черновики (lib/offline.ts)
 */
export interface LyricsDraft {
  /** Id автора правки */
  user: string;
  /** Текст, с которого начата правка */
  base: string;
  /** Текст правки */
  draft: string;
}

/** Результат хука страницы текста */
export interface UseLyricsResult {
  song: UseQueryResult<SongWithStages>;
  crumbs: Crumb[];
  canEdit: boolean;
  /** Текст песни с сервера */
  text: string;
  parts: LyricsPart[];
  isEditing: boolean;
  draft: string;
  /** Текст читают: правка закрыта и он не пустой */
  isReading: boolean;
  /** Правку начали с текста, который на сервере уже другой */
  isOutdated: boolean;
  isSaving: boolean;
  sizeIndex: number;
  isSmallest: boolean;
  isLargest: boolean;
  shouldShowDraftBanner: boolean;
  /** Текст на сервере изменили после начала сохранённой правки */
  isStoredDraftStale: boolean;
  shouldShowEmpty: boolean;
  isCancelConfirmOpen: boolean;
  setIsCancelConfirmOpen: (isOpen: boolean) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onSmallerClick: () => void;
  onLargerClick: () => void;
  onCopyClick: () => Promise<void>;
  onEditClick: () => void;
  onDiscardClick: () => void;
  onCancelClick: () => void;
  onCancelConfirm: () => void;
  onFormSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDraftChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  handleTagAdd: (tag: string) => void;
}

/** Пропсы кнопок шапки в режиме чтения */
export interface ReadingActionsProps {
  canEdit: boolean;
  isSmallest: boolean;
  isLargest: boolean;
  onSmallerClick: () => void;
  onLargerClick: () => void;
  onCopyClick: () => Promise<void>;
  onEditClick: () => void;
}

/** Пропсы плашки сохранённой правки */
export interface StoredDraftBannerProps {
  /** Текст на сервере изменили после начала правки */
  isStale: boolean;
  onDiscardClick: () => void;
  onContinueClick: () => void;
}

/** Пропсы текста для чтения */
export interface LyricsReaderProps {
  parts: LyricsPart[];
  sizeIndex: number;
}

/** Пропсы части текста */
export interface LyricsPartBlockProps {
  part: LyricsPart;
}

/** Пропсы кнопки метки части песни */
export interface TagButtonProps {
  tag: string;
  isDisabled: boolean;
  onTagAdd: (tag: string) => void;
}

/** Пропсы формы правки текста */
export interface LyricsFormProps {
  draft: string;
  isSaving: boolean;
  isOutdated: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onFormSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDraftChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onTagAdd: (tag: string) => void;
  onCancelClick: () => void;
}
