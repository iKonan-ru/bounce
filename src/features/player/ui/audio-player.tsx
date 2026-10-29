import { Pause, Play, Download, RefreshCw, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';
import { useAudioPlayer } from '../hooks/use-audio-player';
import type { AudioPlayerProps } from '../types/audio-player';

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
