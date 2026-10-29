import { Pause, Play, Download, RefreshCw, Trash2 } from 'lucide-react';
import type { RefObject, ReactNode } from 'react';
import { useState, useEffect, useRef } from 'react';
import type { AudioMeta } from '@/lib/player';
import { formatTime, usePlayer, togglePlay, playTrack } from '@/lib/player';
import { useFileUrl } from '@/shared/hooks';
import type { FileRecord } from '@/shared/types';
import { cn } from '@/shared/utils';
import { useLocation } from '@tanstack/react-router';

/** Насколько заранее, до появления на экране, запись начинает читать заголовки файла */
const NEAR_SCREEN_MARGIN = '200px';

/** Расширение в имени файла: 2-4 латинские буквы или цифры после точки */
const EXTENSION_RE = /\.([a-z0-9]{2,4})$/i;

/** Разделитель длительности и формата */
const INFO_SEPARATOR = ' \u00B7 ';

/** Результат хука близости к экрану */
interface UseNearScreenResult {
  /** Запись на экране или вот-вот покажется; однажды став true, больше не меняется */
  isNearScreen: boolean;
}

/** Результат хука длительности записи */
interface UseDurationResult {
  /** Длительность в секундах; 0 - ещё неизвестна */
  duration: number;
}

/** Пропсы записи */
interface AudioPlayerProps {
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
interface UseAudioPlayerParams extends Pick<
  AudioPlayerProps,
  'record' | 'file' | 'name'
> {
  meta: AudioMeta | undefined;
  shouldReadTags: boolean | undefined;
  caption: string | undefined;
}

/** Результат хука записи */
interface UseAudioPlayerResult {
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

/**
 * Запись показалась на экране (или вот-вот покажется)
 *
 * До этого файл не трогаем: в ленте "Все заметки" десятки записей, и каждая просила бы у сервера
 * заголовки
 */
function useNearScreen(
  ref: RefObject<HTMLElement | null>
): UseNearScreenResult {
  const [isNearScreen, setIsNearScreen] = useState(false);
  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    if (isNearScreen) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsNearScreen(true);

      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNearScreen(true);
        }
      },
      { rootMargin: NEAR_SCREEN_MARGIN }
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, isNearScreen]);

  return { isNearScreen };
}

/** Длительность записи до запуска: читаются только её заголовки */
function useDuration(src: string | undefined): UseDurationResult {
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    if (!src) {
      return;
    }

    const audio = new Audio();
    audio.preload = 'metadata';
    const onMetadataLoad = (): void => {
      setDuration(audio.duration);
    };
    audio.addEventListener('loadedmetadata', onMetadataLoad);
    audio.src = src;

    return () => {
      audio.removeEventListener('loadedmetadata', onMetadataLoad);
      audio.removeAttribute('src');
      audio.load();
    };
  }, [src]);

  return { duration };
}

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
function useAudioPlayer({
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

/**
 * Запись в заметке или релизе: кнопка запуска, название, длительность и формат, скачивание
 *
 * Ход и перемотка - в полосе плеера внизу: запись играет дальше при переходах между страницами.
 * Название показывается без расширения: формат и так виден рядом с длительностью; скачивается
 * файл с полным исходным именем
 */
export function AudioPlayer({
  record,
  file,
  name,
  meta,
  shouldReadTags,
  caption,
  onReplace,
  onRemove,
}: AudioPlayerProps): ReactNode {
  const {
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
    downloadLabel,
    replaceLabel,
    removeLabel,
    onPlayClick,
  } = useAudioPlayer({
    record,
    file,
    name,
    meta,
    shouldReadTags: shouldReadTags,
    caption,
  });
  const rootClassName = cn(
    'flex items-center gap-3 rounded-xl p-1.5 pr-2 ring-1 transition-colors',
    {
      'bg-groove/60 ring-border dark:ring-white/10': isCurrent,
      'bg-console/70 ring-border/60 dark:bg-black/15 dark:ring-border/40':
        !isCurrent,
    }
  );
  const infoClassName = cn('truncate text-[0.6875rem] text-dim tabular-nums', {
    'sm:hidden': hasCaption,
  });

  return (
    <div ref={rootRef} className={rootClassName}>
      <button
        type="button"
        aria-label={playLabel}
        disabled={isPlayDisabled}
        onClick={onPlayClick}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tape text-tape-ink shadow-sm transition-transform active:scale-90 disabled:opacity-40"
      >
        {isPlaying ? (
          <Pause className="size-4 fill-current" />
        ) : (
          <Play className="ml-0.5 size-4 fill-current" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        {caption && (
          <p className="truncate text-[0.6875rem] text-dim">{caption}</p>
        )}
        <p className="truncate text-sm font-medium" title={name}>
          {title}
        </p>
        {/* с подписью сверху длительность и формат - справа, а на телефоне, где рядом ещё
            кнопки, - под названием, чтобы оно не обрезалось */}
        {info && <p className={infoClassName}>{info}</p>}
      </div>
      {showSideInfo && (
        <span className="shrink-0 text-[0.6875rem] text-dim tabular-nums max-sm:hidden">
          {info}
        </span>
      )}
      {downloadUrl && (
        <a
          href={downloadUrl}
          // своё имя файла: на сервере оно без кириллицы
          download={name}
          aria-label={downloadLabel}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-groove hover:text-ink"
        >
          <Download className="size-4" />
        </a>
      )}
      {onReplace && (
        <button
          type="button"
          aria-label={replaceLabel}
          title="Заменить"
          onClick={onReplace}
          className="-ml-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-groove hover:text-ink"
        >
          <RefreshCw className="size-4" />
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="-ml-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-led-red/10 hover:text-led-red"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}
