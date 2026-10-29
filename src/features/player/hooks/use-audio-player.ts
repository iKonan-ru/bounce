import { useRef } from 'react';
import { useFileUrl } from '@/shared/hooks';
import { useLocation } from '@tanstack/react-router';
import { EXTENSION_RE, INFO_SEPARATOR } from '../constants/audio-player';
import { formatTime, togglePlay, playTrack } from '../store/player';
import type {
  UseAudioPlayerParams,
  UseAudioPlayerResult,
} from '../types/audio-player';
import { useDuration } from './use-duration';
import { useNearScreen } from './use-near-screen';
import { usePlayer } from './use-player';

/** Расширение файла по имени */
function getExtension(name: string): string | undefined {
  return EXTENSION_RE.exec(name)?.[1];
}

/** Название без расширения: формат и так виден рядом с длительностью */
function getTitleWithoutExtension(
  name: string,
  extension: string | undefined
): string {
  if (!extension) {
    return name;
  }

  const extensionLength = extension.length + 1;

  if (name.length <= extensionLength) {
    return name;
  }

  return name.slice(0, -extensionLength);
}

/** Время записи: у играющей - ход и длительность, у остальной - длительность, если известна */
function getTimeLabel(
  isCurrent: boolean,
  current: number,
  duration: number
): string {
  if (isCurrent) {
    return `${formatTime(current)} / ${formatTime(duration)}`;
  }

  if (duration) {
    return formatTime(duration);
  }

  return '';
}

/** Запись: запуск в общем плеере, название, длительность и формат, ссылка на скачивание */
export function useAudioPlayer({
  record,
  file,
  name,
  meta,
  shouldReadTags,
  caption,
}: UseAudioPlayerParams): UseAudioPlayerResult {
  const fileUrl = useFileUrl();
  const src = fileUrl(record, file);
  const downloadUrl = fileUrl(record, file, undefined, true);
  const { pathname } = useLocation();
  const player = usePlayer();
  const key = `${record.collectionName}/${record.id}/${file}`;
  const isCurrent = player.track?.key === key;
  const isPlaying = isCurrent && player.isPlaying;
  const rootRef = useRef<HTMLDivElement>(null);
  const { isNearScreen } = useNearScreen(rootRef);
  const durationSrc = isNearScreen ? src : undefined;
  const { duration: ownDuration } = useDuration(durationSrc);
  const hasPlayerDuration = isCurrent && Boolean(player.duration);
  const duration = hasPlayerDuration ? player.duration : ownDuration;
  const isFailed = isCurrent && player.isFailed;
  const extension = getExtension(name);
  const format = extension?.toUpperCase();
  const title = getTitleWithoutExtension(name, extension);

  const onPlayClick = (): void => {
    if (isCurrent) {
      togglePlay();

      return;
    }

    void playTrack({
      key,
      name,
      file: { record, name: file },
      meta,
      shouldReadTags,
      origin: pathname,
    });
  };

  const timeLabel = getTimeLabel(isCurrent, player.current, duration);
  const details = [timeLabel, format].filter(Boolean).join(INFO_SEPARATOR);
  const info = isFailed ? 'не открывается' : details;
  const pauseLabel = `Пауза: ${title}`;
  const listenLabel = `Слушать: ${title}`;
  const playLabel = isPlaying ? pauseLabel : listenLabel;
  const isPlayDisabled = !src || isFailed;
  const hasCaption = Boolean(caption);
  const hasInfo = Boolean(info);
  const showSideInfo = hasCaption && hasInfo;

  return {
    rootRef,
    downloadUrl,
    title,
    info,
    isCurrent,
    hasCaption,
    showSideInfo,
    isPlaying,
    isPlayDisabled,
    playLabel,
    downloadLabel: `Скачать: ${title}`,
    replaceLabel: `Заменить: ${title}`,
    removeLabel: `Убрать: ${title}`,
    onPlayClick,
  };
}
