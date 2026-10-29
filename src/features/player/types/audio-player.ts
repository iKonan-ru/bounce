import type { RefObject } from 'react';
import type { FileRecord } from '@/shared/types';
import type { AudioMeta } from './player';

/** Результат хука близости к экрану */
export interface UseNearScreenResult {
  /** Запись на экране или вот-вот покажется; однажды став true, больше не меняется */
  isNearScreen: boolean;
}

/** Результат хука длительности записи */
export interface UseDurationResult {
  /** Длительность в секундах; 0 - ещё неизвестна */
  duration: number;
}

/** Пропсы записи */
export interface AudioPlayerProps {
  record: FileRecord;
  file: string;
  name: string;
  /** Готовые сведения для системы (финальная версия: песня и её обложка) */
  meta?: AudioMeta;
  /** Взять сведения из тегов MP3; у WAV и файлов без тегов - только имя файла */
  shouldReadTags?: boolean;
  /** Что это за запись, мелко над названием ("Финальная версия") */
  caption?: string;
  /** Кнопка "заменить" рядом со скачиванием */
  onReplace?: (() => void) | undefined;
  /** Кнопка "убрать" рядом со скачиванием */
  onRemove?: (() => void) | undefined;
}

/** Параметры хука записи */
export interface UseAudioPlayerParams extends Pick<
  AudioPlayerProps,
  'record' | 'file' | 'name'
> {
  meta: AudioMeta | undefined;
  shouldReadTags: boolean | undefined;
  caption: string | undefined;
}

/** Результат хука записи */
export interface UseAudioPlayerResult {
  rootRef: RefObject<HTMLDivElement | null>;
  downloadUrl: string | undefined;
  /** Название без расширения */
  title: string;
  /** Длительность и формат или сообщение, что файл не открывается */
  info: string;
  /** Эта запись сейчас в плеере */
  isCurrent: boolean;
  hasCaption: boolean;
  /** Длительность и формат справа: с подписью сверху, на широком экране */
  showSideInfo: boolean;
  isPlaying: boolean;
  isPlayDisabled: boolean;
  playLabel: string;
  downloadLabel: string;
  replaceLabel: string;
  removeLabel: string;
  onPlayClick: () => void;
}
