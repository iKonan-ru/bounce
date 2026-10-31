import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent, MouseEvent, KeyboardEvent } from 'react';
import {
  AXIS_THRESHOLD,
  ADVANCE_THRESHOLD,
  DELETE_WIDTH,
} from '../constants/swipe';
import type { SwipeGesture, SwipeGestureOptions } from '../types/stage-swipe';

/** Горизонтальный жест не перехватывает прокрутку и ручку перестановки */
export function useSwipeGesture({
  canAdvance,
  canDelete,
  onAdvance,
}: SwipeGestureOptions) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<SwipeGesture | null>(null);
  const suppressClick = useRef(false);
  const offsetRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const isEnabled = canAdvance || canDelete;
  const isOpen = offset === -DELETE_WIDTH && !isDragging;

  const move = useCallback((value: number): void => {
    offsetRef.current = value;
    setOffset(value);
  }, []);
  const close = useCallback((): void => {
    gesture.current = null;
    setIsDragging(false);
    move(0);
  }, [move]);

  useEffect(() => {
    if (!isEnabled) {
      close();
    }
  }, [isEnabled, close]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onOutsidePointerDown = (event: globalThis.PointerEvent): void => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        close();
      }
    };
    document.addEventListener('pointerdown', onOutsidePointerDown);
    window.addEventListener('scroll', close, true);

    return () => {
      document.removeEventListener('pointerdown', onOutsidePointerDown);
      window.removeEventListener('scroll', close, true);
    };
  }, [isOpen, close]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    suppressClick.current = false;

    if (!isEnabled || event.pointerType !== 'touch' || !event.isPrimary) {
      return;
    }

    if (
      event.target instanceof Element &&
      event.target.closest('button, input, textarea, select')
    ) {
      return;
    }

    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offset: offsetRef.current,
      axis: 'pending',
    };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const start = gesture.current;

    if (!start || start.id !== event.pointerId || start.axis === 'vertical') {
      return;
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (start.axis === 'pending') {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_THRESHOLD) {
        return;
      }

      if (Math.abs(dx) <= Math.abs(dy) * 1.25) {
        start.axis = 'vertical';

        return;
      }

      start.axis = 'horizontal';
      suppressClick.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
    }

    const maximum =
      canAdvance && start.offset === 0 ? ADVANCE_THRESHOLD + 24 : 0;
    move(
      Math.max(
        canDelete ? -DELETE_WIDTH : 0,
        Math.min(maximum, start.offset + dx)
      )
    );
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    const start = gesture.current;

    if (!start || start.id !== event.pointerId) {
      return;
    }

    const shouldAdvance =
      start.axis === 'horizontal' &&
      start.offset === 0 &&
      offsetRef.current >= ADVANCE_THRESHOLD &&
      canAdvance;
    const shouldOpen =
      start.axis === 'horizontal' &&
      offsetRef.current < -DELETE_WIDTH / 2 &&
      canDelete;
    gesture.current = null;
    setIsDragging(false);

    if (start.axis === 'horizontal') {
      move(shouldOpen ? -DELETE_WIDTH : 0);
    }

    if (shouldAdvance) {
      onAdvance();
    }
  };
  const onPointerCancel = (): void => close();
  const onClickCapture = (event: MouseEvent<HTMLDivElement>): void => {
    if (suppressClick.current && event.detail > 0) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick.current = false;

      return;
    }

    if (isOpen) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      close();
    }
  };

  return {
    rootRef,
    offset,
    isOpen,
    isDragging,
    close,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
    onKeyDown,
  };
}
