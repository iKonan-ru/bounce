import type { RefObject, ChangeEvent } from 'react';
import type { Song, SongStatus } from '@/entities/song';
import type { Crumb } from '@/shared/types';

/** Правка полей песни из формы */
export interface SongPatch extends Partial<
  Pick<Song, 'status' | 'bpm' | 'key' | 'target_release'>
> {}

/** Правка обложек песни: поля записи и их значения */
export interface CoversPatch extends Record<string, string> {}

/** Пропсы названия песни в шапке */
export interface SongTitleProps {
  /** Название; пока песня не загружена - undefined */
  title: string | undefined;
  onSave: (title: string) => void;
}

/** Состояние страницы настроек песни */
export interface UseSongEditPageResult {
  projectId: string;
  songId: string;
  crumbs: Crumb[];
  /** Не редактор: настройки не для него */
  shouldRedirect: boolean;
  isPending: boolean;
  song: Song | undefined;
  onTitleSave: (title: string) => void;
}

/** Пропсы пункта выбора статуса */
export interface StatusMenuItemProps {
  status: SongStatus;
  /** Статус, сохранённый в записи песни */
  currentStatus: SongStatus;
  onStatusSelect: (status: SongStatus) => void;
}

/** Пропсы формы песни */
export interface SongFormProps {
  song: Song;
}

/** Действия формы песни */
export interface UseSongFormResult {
  onStatusSelect: (status: SongStatus) => void;
  onBpmSave: (value: string) => void;
  onKeyChange: (key: string) => void;
}

/** Пропсы плитки обложки */
export interface CoverTileProps {
  songTitle: string;
  /** Имя файла обложки */
  cover: string;
  /** Ссылка на большую копию; пока нет токена - undefined */
  url: string | undefined;
  isMain: boolean;
  isBusy: boolean;
  onView: (cover: string) => void;
  onMakeMain: (cover: string) => void;
  onRemove: (cover: string) => void;
}

/** Подписи и обработчики плитки обложки */
export interface UseCoverTileResult {
  openLabel: string;
  mainLabel: string;
  isMainDisabled: boolean;
  onViewClick: () => void;
  onMainClick: () => void;
  onRemoveClick: () => void;
}

/** Пропсы обложек песни */
export interface CoversProps {
  song: Song;
}

/** Состояние и действия обложек песни */
export interface UseCoversResult {
  covers: readonly string[];
  /** Основная обложка */
  mainCover: string | undefined;
  /** Ссылка на большую копию обложки */
  getCoverUrl: (cover: string) => string | undefined;
  fileInputRef: RefObject<HTMLInputElement | null>;
  /** Ход загрузки в процентах; без загрузки - null */
  uploadPercent: number | null;
  isBusy: boolean;
  isAddDisabled: boolean;
  isUpdating: boolean;
  isRemoveOpen: boolean;
  /** Открытая на весь экран обложка */
  viewerSrc: string | undefined;
  viewerDownloadUrl: string | undefined;
  onCoverView: (cover: string) => void;
  onCoverMakeMain: (cover: string) => void;
  onCoverRemove: (cover: string) => void;
  onAddClick: () => void;
  onFilesPick: (files: File[]) => void;
  onFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveOpenChange: (isOpen: boolean) => void;
  onRemoveConfirm: () => void;
  onViewerClose: () => void;
}

/** Пропсы удаления песни */
export interface DeleteSongProps {
  projectId: string;
  song: Song;
}

/** Состояние удаления песни */
export interface UseDeleteSongResult {
  isConfirming: boolean;
  setIsConfirming: (isConfirming: boolean) => void;
  isRemoving: boolean;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
}
