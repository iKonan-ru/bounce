import type { RefObject, ChangeEvent } from 'react';
import type { Song } from '@/entities/song';
import type { AudioMeta } from '@/features/player';

/** Правка полей релиза песни */
export type ReleasePatch = Partial<
  Pick<Song, 'status' | 'target_release' | 'bandlink'>
>;

/** Пропсы блока релиза */
export interface ReleaseSectionProps {
  projectId: string;
  song: Song;
  /** Можно менять релиз; без этого - только смотреть и скачать обложку */
  isEditable: boolean;
}

/** Состояние и обработчики блока релиза */
export interface UseReleaseSectionResult {
  coverInputRef: RefObject<HTMLInputElement | null>;
  isSent: boolean;
  isOnLabel: boolean;
  isReleased: boolean;
  targetRelease: string;
  releaseDateLabel: string;
  releaseCover: string | undefined;
  coverTitle: string;
  coverMissingNote: string;
  coverDownloadUrl: string | undefined;
  coverActionLabel: string;
  canUploadCover: boolean;
  isCoverUploadPending: boolean;
  isCoverUploading: boolean;
  coverProgressPercent: number;
  hasLyrics: boolean;
  bandlinkHref: string | undefined;
  bandlinkValue: string;
  showBandlinkLink: boolean;
  canEditBandlink: boolean;
  showNotSentNote: boolean;
  canSend: boolean;
  sendNote: string;
  hasMissing: boolean;
  isSendDisabled: boolean;
  isSavePending: boolean;
  releasePlanNote: string;
  releasedDateSuffix: string;
  onCoverPick: ((file: File) => void) | undefined;
  onReleaseDateChange: (targetRelease: string) => void;
  onCoverUploadClick: () => void;
  onCoverInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBandlinkSave: (bandlink: string) => void;
  onSendClick: () => void;
  onCancelSendClick: () => void;
}

/** Пропсы финальной версии трека */
export interface ReleaseAudioProps {
  song: Song;
  isEditable: boolean;
  /** Песня отправлена на лейбл: трек уже не убрать */
  isSent: boolean;
}

/** Состояние и обработчики финальной версии трека */
export interface UseReleaseAudioResult {
  audioInputRef: RefObject<HTMLInputElement | null>;
  file: string | undefined;
  name: string;
  isHidden: boolean;
  isUploadPending: boolean;
  isUploading: boolean;
  progressPercent: number;
  /** Файл для плеера; пока идёт загрузка - undefined */
  playerFile: string | undefined;
  audioMeta: AudioMeta;
  isRemoving: boolean;
  setIsRemoving: (isRemoving: boolean) => void;
  isRemovePending: boolean;
  onReplace: (() => void) | undefined;
  onRemove: (() => void) | undefined;
  onAudioUploadClick: () => void;
  onAudioInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveConfirm: () => void;
}

/** Поля записи песни без финальной версии трека */
export interface ClearedReleaseAudio {
  release_audio: null;
  release_audio_name: string;
}
