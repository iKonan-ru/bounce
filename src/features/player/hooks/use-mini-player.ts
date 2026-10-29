import type { CSSProperties } from 'react';
import { useState } from 'react';
import { getBaseName } from '@/shared/utils';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { PERCENT, SUBTITLE_SEPARATOR } from '../constants/mini-player';
import { formatTime } from '../store/player';
import type { UseMiniPlayerResult } from '../types/mini-player';
import { usePlayer } from './use-player';

/** Доля 0..1 как ширина полосы */
function getWidthStyle(fraction: number): CSSProperties {
  return { width: `${fraction * PERCENT}%` };
}

/** Доля 0..1 как левый край полосы, которая идёт до конца */
function getLeftStyle(fraction: number): CSSProperties {
  return { left: `${fraction * PERCENT}%` };
}

/** Сколько записи проиграно, 0..1; пока длина неизвестна - 0 */
function getPlayedFraction(current: number, duration: number): number {
  const hasDuration = duration > 0;

  if (!hasDuration) {
    return 0;
  }

  return current / duration;
}

/** Время на полосе: пока тянут - куда тянут, иначе - сколько проиграно */
function getShownTime(
  scrubFraction: number | null,
  current: number,
  duration: number
): number {
  if (scrubFraction === null) {
    return current;
  }

  return scrubFraction * duration;
}

/** Полоса плеера: что играет, ход записи и куда ведёт название; null - ничего не играет */
export function useMiniPlayer(): UseMiniPlayerResult | null {
  const player = usePlayer();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // куда тянут по полосе (0..1), пока палец или мышь не отпустили
  const [scrubFraction, setScrubFraction] = useState<number | null>(null);
  const track = player.track;

  if (!track) {
    return null;
  }

  const title = player.meta?.title || getBaseName(track.name);
  const subtitle = [player.meta?.artist, player.meta?.album]
    .filter(Boolean)
    .join(SUBTITLE_SEPARATOR);
  const playedFraction = getPlayedFraction(player.current, player.duration);
  const progress = scrubFraction ?? playedFraction;
  const shownTime = getShownTime(
    scrubFraction,
    player.current,
    player.duration
  );
  const isAway = Boolean(track.origin) && track.origin !== pathname;
  const originTitle = isAway ? 'Открыть, откуда играет' : undefined;
  const pauseLabel = `Пауза: ${title}`;
  const listenLabel = `Слушать: ${title}`;
  const playLabel = player.isPlaying ? pauseLabel : listenLabel;
  const playTimeLabel = `${formatTime(shownTime)} / ${formatTime(player.duration)}`;
  const timeLabel = player.isFailed ? 'не открывается' : playTimeLabel;

  const onTitleClick = (): void => {
    if (!track.origin) {
      return;
    }

    void navigate({ to: track.origin });
  };

  return {
    player,
    title,
    subtitle,
    progress,
    artwork: player.meta?.artwork,
    isAway,
    originTitle,
    playLabel,
    seekLabel: `Перемотка: ${title}`,
    timeLabel,
    unsavedStyle: getLeftStyle(player.saved),
    progressStyle: getWidthStyle(progress),
    setScrubFraction,
    onTitleClick,
  };
}
