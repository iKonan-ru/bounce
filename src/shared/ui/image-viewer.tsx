import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  CLOSE_BUTTON_CLASS_NAME,
  DOWNLOAD_BUTTON_CLASS_NAME,
  IMAGE_NAVIGATION_CLASS_NAME,
} from '../constants/image-viewer';
import { useImageViewer } from '../hooks/use-image-viewer';
import { useSegmentedIndicator } from '../hooks/use-segmented-indicator';
import type {
  ImageViewerProps,
  ImageViewerGallery,
} from '../types/image-viewer';
import { cn } from '../utils/cn';
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogClose,
} from './kit/dialog';

/** Общая рамка перемещается между миниатюрами, оставаясь внутри прокручиваемой ленты */
function ImageViewerThumbnails({
  items,
  index,
  onSelect,
}: ImageViewerGallery): ReactNode {
  const groupRef = useSegmentedIndicator<HTMLDivElement>();
  const selectedRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    selectedRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }, [index]);

  return (
    <div className="shrink-0 overflow-x-auto overscroll-x-contain px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
      <div
        ref={groupRef}
        className="relative mx-auto flex w-max gap-2"
        role="group"
        aria-label="Миниатюры изображений"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-10 h-[var(--indicator-height)] w-[var(--indicator-width)] translate-x-[var(--indicator-x)] translate-y-[var(--indicator-y)] rounded-xl border-2 border-ink transition-[translate,width,height] duration-250 ease-out motion-reduce:transition-none"
        />
        {items.map((item, itemIndex) => {
          const isSelected = itemIndex === index;
          const onClick = (): void => onSelect(itemIndex);
          const thumbnailClassName = cn(
            'size-14 shrink-0 overflow-hidden rounded-xl border-2 border-transparent opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-ink sm:size-16',
            isSelected && 'opacity-100'
          );
          const label = `Изображение ${itemIndex + 1}: ${item.title}`;
          const ref = isSelected ? selectedRef : undefined;

          return (
            <button
              key={item.id}
              ref={ref}
              type="button"
              className={thumbnailClassName}
              aria-label={label}
              aria-pressed={isSelected}
              data-selected={isSelected}
              onClick={onClick}
            >
              <img
                src={item.src}
                alt=""
                className="size-full rounded-lg object-cover"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Просмотр на весь экран: управление сверху, фотография по центру, миниатюры снизу */
export function ImageViewer(props: ImageViewerProps): ReactNode {
  const { src, title, downloadUrl, gallery } = props;
  const {
    isOpen,
    hasGallery,
    index,
    isDragging,
    trackStyle,
    canPrevious,
    canNext,
    onOpenChange,
    onBackgroundPointerDown,
    onBackgroundPointerMove,
    onBackgroundPointerCancel,
    onBackgroundClick,
    onPrevious,
    onNext,
    onKeyDown,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  } = useImageViewer(props);
  const items =
    hasGallery && gallery
      ? gallery.items
      : [{ id: 'image', src, fullSrc: src, title }];
  const trackClassName = cn(
    'flex h-full w-full transition-transform duration-250 ease-out motion-reduce:transition-none',
    isDragging && 'transition-none'
  );
  const previousClassName = cn(IMAGE_NAVIGATION_CLASS_NAME, 'left-3 sm:left-6');
  const nextClassName = cn(IMAGE_NAVIGATION_CLASS_NAME, 'right-3 sm:right-6');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="w-screen backdrop-brightness-90" />
        <DialogPrimitive.Content
          data-image-viewer
          className="fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-hidden text-ink outline-none"
          aria-describedby={undefined}
          onKeyDown={onKeyDown}
          onPointerDownCapture={onBackgroundPointerDown}
          onPointerMoveCapture={onBackgroundPointerMove}
          onPointerCancelCapture={onBackgroundPointerCancel}
          onClick={onBackgroundClick}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <header className="flex shrink-0 items-center justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
            <span
              role="status"
              className="px-2 text-sm font-medium tabular-nums"
            >
              {index + 1} / {items.length}
            </span>
            <div className="flex items-center gap-2">
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download
                  className={DOWNLOAD_BUTTON_CLASS_NAME}
                >
                  <Download className="size-4" />
                  Скачать оригинал
                </a>
              )}
              <DialogClose
                className={CLOSE_BUTTON_CLASS_NAME}
                aria-label="Закрыть"
              >
                <X className="size-5" />
              </DialogClose>
            </div>
          </header>
          <div className="relative min-h-0 flex-1">
            <div
              className="h-full w-full touch-pan-y touch-pinch-zoom overflow-hidden"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onTouchCancel={onTouchCancel}
            >
              <div className={trackClassName} style={trackStyle}>
                {items.map((item, itemIndex) => {
                  const isSelected = itemIndex === index;
                  const alt = isSelected ? title : item.title;
                  const loading = isSelected ? 'eager' : 'lazy';

                  return (
                    <div
                      key={item.id}
                      aria-hidden={!isSelected}
                      className="flex h-full w-full shrink-0 items-center justify-center px-3 py-3 sm:px-16"
                    >
                      <img
                        src={item.fullSrc}
                        alt={alt}
                        loading={loading}
                        draggable={false}
                        className="block h-auto max-h-full w-auto max-w-full rounded-xl object-contain"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            {hasGallery && (
              <>
                <button
                  type="button"
                  aria-label="Предыдущее изображение"
                  className={previousClassName}
                  disabled={!canPrevious}
                  onClick={onPrevious}
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  aria-label="Следующее изображение"
                  className={nextClassName}
                  disabled={!canNext}
                  onClick={onNext}
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>
          {hasGallery && gallery && <ImageViewerThumbnails {...gallery} />}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
