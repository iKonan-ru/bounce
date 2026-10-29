import type { CSSProperties, PointerEvent, KeyboardEvent } from 'react';
import type { PlayerState } from './player';

/** Стиль шкалы громкости с заполненной частью в CSS-переменной (.volume-range в app/styles/index.css) */
export interface FillStyle extends CSSProperties {
  '--fill': string;
}

/** Результат хука полосы плеера */
export interface UseMiniPlayerResult {
  player: PlayerState;
  /** Название: из тегов или имя файла */
  title: string;
  /** Исполнитель и альбом */
  subtitle: string;
  /** Ход записи 0..1; пока тянут - куда тянут */
  progress: number;
  /** Обложка из тегов */
  artwork: string | undefined;
  /** Запись запущена на другой странице: название ведёт туда */
  isAway: boolean;
  /** Подсказка на названии */
  originTitle: string | undefined;
  playLabel: string;
  seekLabel: string;
  timeLabel: string;
  /** Ещё не скачанная на устройство часть полосы: от скачанного до конца */
  unsavedStyle: CSSProperties;
  progressStyle: CSSProperties;
  setScrubFraction: (fraction: number | null) => void;
  onTitleClick: () => void;
}

/** Пропсы области перемотки */
export interface SeekAreaProps {
  label: string;
  duration: number;
  current: number;
  /** Куда тянут (0..1); null - отпустили */
  onScrub: (fraction: number | null) => void;
}

/** Параметры хука области перемотки */
export interface UseSeekAreaParams extends Omit<SeekAreaProps, 'label'> {}

/** Результат хука области перемотки */
export interface UseSeekAreaResult {
  isReady: boolean;
  tabIndex: number;
  valueMax: number;
  valueNow: number;
  valueText: string;
  onSliderPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onSliderPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onSliderPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onSliderPointerCancel: () => void;
  onSliderKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

/** Пропсы плеерных значков и ползунков громкости */
export interface VolumeProps {
  player: PlayerState;
}

/** Пропсы ползунка громкости */
export interface VolumeSliderProps extends VolumeProps {
  className?: string;
}
