import { useRef, useState } from 'react';
import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  TouchEvent,
} from 'react';
import {
  IMAGE_SWIPE_THRESHOLD,
  IMAGE_SWIPE_RESISTANCE,
} from '../constants/image-viewer';
import { AXIS_THRESHOLD, HORIZONTAL_RATIO } from '../constants/swipe';
import type { ImageViewerProps, ImageViewerTouch } from '../types/image-viewer';

/** Лента следует за пальцем; короткий или отмененный жест возвращает текущий кадр */
export function useImageViewer({ src, gallery, onClose }: ImageViewerProps) {
  const touch = useRef<ImageViewerTouch | null>(null);
  const backgroundPress = useRef<Pick<ImageViewerTouch, 'x' | 'y'> | null>(
    null
  );
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const isOpen = src !== undefined;
  const hasGallery = Boolean(gallery && gallery.items.length > 1);
  const index = hasGallery && gallery ? gallery.index : 0;
  const canPrevious = hasGallery && index > 0;
  const canNext = Boolean(
    hasGallery && gallery && index < gallery.items.length - 1
  );
  const trackStyle: CSSProperties = {
    transform: `translate3d(calc(${-index * 100}% + ${offset}px), 0, 0)`,
  };

  const onTouchCancel = (): void => {
    touch.current = null;
    setIsDragging(false);
    setOffset(0);
  };
  const onOpenChange = (isNextOpen: boolean): void => {
    if (!isNextOpen) {
      backgroundPress.current = null;
      onTouchCancel();
      onClose();
    }
  };
  const onBackgroundPointerCancel = (): void => {
    backgroundPress.current = null;
  };
  const onBackgroundPointerDown = (
    event: PointerEvent<HTMLDivElement>
  ): void => {
    onBackgroundPointerCancel();

    if (!event.isPrimary || !(event.target instanceof Element)) {
      return;
    }

    if (event.target.closest('img, button, a, [role="status"]')) {
      return;
    }

    backgroundPress.current = { x: event.clientX, y: event.clientY };
  };
  const onBackgroundPointerMove = (
    event: PointerEvent<HTMLDivElement>
  ): void => {
    const start = backgroundPress.current;

    if (!start) {
      return;
    }

    const distance = Math.hypot(
      event.clientX - start.x,
      event.clientY - start.y
    );

    if (distance >= AXIS_THRESHOLD) {
      onBackgroundPointerCancel();
    }
  };
  const onBackgroundClick = (): void => {
    if (backgroundPress.current) {
      onOpenChange(false);
    }
  };
  const onPrevious = (): void => {
    onTouchCancel();

    if (canPrevious && gallery) {
      gallery.onSelect(index - 1);
    }
  };
  const onNext = (): void => {
    onTouchCancel();

    if (canNext && gallery) {
      gallery.onSelect(index + 1);
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!hasGallery || !['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === 'ArrowLeft') {
      onPrevious();
    } else {
      onNext();
    }
  };
  const onTouchStart = (event: TouchEvent<HTMLDivElement>): void => {
    onTouchCancel();
    const point = event.touches[0];
    const canSwipe = [
      hasGallery,
      event.touches.length === 1,
      (window.visualViewport?.scale ?? 1) <= 1,
    ].every(Boolean);

    if (canSwipe && point) {
      touch.current = {
        x: point.clientX,
        y: point.clientY,
        isHorizontal: false,
      };
    }
  };
  const onTouchMove = (event: TouchEvent<HTMLDivElement>): void => {
    const point = event.touches[0];
    const start = touch.current;

    if (!start || !point) {
      return;
    }

    if (event.touches.length !== 1) {
      onTouchCancel();

      return;
    }

    const dx = point.clientX - start.x;
    const dy = point.clientY - start.y;

    if (!start.isHorizontal) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_THRESHOLD) {
        return;
      }

      if (Math.abs(dx) <= Math.abs(dy) * HORIZONTAL_RATIO) {
        onTouchCancel();

        return;
      }

      start.isHorizontal = true;
      setIsDragging(true);
    }

    const isPastStart = dx > 0 && !canPrevious;
    const isPastEnd = dx < 0 && !canNext;
    const nextOffset =
      isPastStart || isPastEnd ? dx * IMAGE_SWIPE_RESISTANCE : dx;
    setOffset(nextOffset);
  };
  const onTouchEnd = (event: TouchEvent<HTMLDivElement>): void => {
    const start = touch.current;
    const point = event.changedTouches[0];
    onTouchCancel();

    if (!start?.isHorizontal || !point || event.touches.length > 0) {
      return;
    }

    const dx = point.clientX - start.x;

    if (Math.abs(dx) < IMAGE_SWIPE_THRESHOLD) {
      return;
    }

    if (dx > 0) {
      onPrevious();
    } else {
      onNext();
    }
  };

  return {
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
  };
}
