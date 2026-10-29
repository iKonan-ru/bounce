import { ImagePlus, X } from 'lucide-react';
import type { ReactNode, CSSProperties } from 'react';
import { MIN_PROGRESS_PERCENT, PERCENT } from '../constants/images';
import { IMAGE_ACCEPT } from '../constants/limits';
import { useImageSlot } from '../hooks/use-image-slot';
import type { PendingSlotProps, ImageSlotProps } from '../types/images';
import { cn } from '../utils/cn';
import { ImageViewer } from './image-viewer';

/** Картинка в пути на сервер: локальная копия с полоской хода */
function PendingSlot({
  pending,
  title,
  slotClassName,
}: PendingSlotProps): ReactNode {
  const statusLabel = `Загрузка: ${title}`;
  const pendingClassName = cn(slotClassName, 'relative');
  const isSent = pending.progress >= 1;
  const barClassName = cn(
    'block h-full rounded-full bg-white transition-[width]',
    {
      'animate-pulse': isSent,
    }
  );
  const progressPercent = Math.max(
    MIN_PROGRESS_PERCENT,
    Math.round(pending.progress * PERCENT)
  );
  const barStyle: CSSProperties = { width: `${progressPercent}%` };

  return (
    <span role="status" aria-label={statusLabel} className={pendingClassName}>
      <img
        src={pending.url}
        alt=""
        className="size-full object-cover opacity-70"
      />
      <span className="absolute inset-x-[12%] bottom-[12%] h-1 overflow-hidden rounded-full bg-black/40">
        <span className={barClassName} style={barStyle} />
      </span>
    </span>
  );
}

/**
 * Картинка-место: по пустой - выбор файла; загруженная с zoom открывается на весь экран, с
 * replace - заменяется новой; крестик сверху (onRemove) убирает картинку
 */
export function ImageSlot(props: ImageSlotProps): ReactNode {
  const {
    title,
    placeholder,
    onPick,
    accept = IMAGE_ACCEPT,
    pending,
    onRemove,
  } = props;
  const {
    inputRef,
    slotClassName,
    image,
    showPlaceholder,
    canPickFilled,
    isStatic,
    showRemove,
    buttonLabel,
    removeLabel,
    buttonClassName,
    viewerSrc,
    downloadUrl,
    onSlotClick,
    onFileInputChange,
    onViewerClose,
  } = useImageSlot(props);

  if (pending) {
    return (
      <PendingSlot
        pending={pending}
        title={title}
        slotClassName={slotClassName}
      />
    );
  }

  if (isStatic) {
    return (
      <span aria-hidden="true" className={slotClassName}>
        {image}
        {showPlaceholder && placeholder}
      </span>
    );
  }

  return (
    <>
      <span className="relative inline-flex shrink-0">
        <button
          type="button"
          aria-label={buttonLabel}
          onClick={onSlotClick}
          className={buttonClassName}
        >
          {image}
          {showPlaceholder && (
            <span className="flex flex-col items-center gap-1">
              <span className="group-hover/slot:hidden">{placeholder}</span>
              <ImagePlus className="hidden size-5 group-hover/slot:block" />
            </span>
          )}
          {canPickFilled && (
            <span className="absolute inset-0 hidden items-center justify-center bg-black/35 text-white group-hover/slot:flex">
              <ImagePlus className="size-5" />
            </span>
          )}
        </button>
        {showRemove && (
          <button
            type="button"
            aria-label={removeLabel}
            onClick={onRemove}
            className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-panel text-dim shadow-sm ring-1 ring-border transition-colors hover:text-ink"
          >
            <X className="size-3" />
          </button>
        )}
      </span>
      {onPick && (
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={onFileInputChange}
        />
      )}
      <ImageViewer
        src={viewerSrc}
        title={title}
        downloadUrl={downloadUrl}
        onClose={onViewerClose}
      />
    </>
  );
}
