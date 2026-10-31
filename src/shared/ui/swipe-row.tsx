import { Check, Play, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { ADVANCE_THRESHOLD } from '../constants/swipe';
import { useSwipeGesture } from '../hooks/use-swipe-gesture';
import type { SwipeRowProps } from '../types/swipe';
import { cn } from '../utils/cn';
import { Button } from './kit/button';

/** Общая строка: вправо - следующий статус, влево - кнопка удаления. */
export function SwipeRow(props: SwipeRowProps): ReactNode {
  const swipe = useSwipeGesture(props);
  const contentClassName = cn('relative bg-panel', {
    'touch-pan-y touch-pinch-zoom': props.canAdvance || props.canDelete,
    'motion-safe:transition-transform motion-safe:duration-200':
      !swipe.isDragging,
  });
  const advanceClassName = cn(
    'absolute inset-y-0 left-0 flex w-28 flex-col items-center justify-center gap-1 text-xs',
    {
      'bg-led-green/20 text-led-green': props.isFinishing,
      'bg-led-amber/20 text-led-amber': !props.isFinishing,
      'opacity-60': swipe.offset < ADVANCE_THRESHOLD,
    }
  );
  const AdvanceIcon = props.isFinishing ? Check : Play;
  const style = { transform: `translateX(${swipe.offset}px)` };

  const onDeleteClick = (): void => {
    swipe.close();
    props.onDeleteClick();
  };

  return (
    <div
      ref={swipe.rootRef}
      className="relative overflow-hidden"
      onKeyDown={swipe.onKeyDown}
    >
      {swipe.offset > 0 && (
        <div className={advanceClassName} aria-hidden="true">
          <AdvanceIcon className="size-5" />
          {props.advanceLabel}
        </div>
      )}
      {swipe.offset < 0 && (
        <div className="absolute inset-y-0 right-0 w-20 bg-destructive/10">
          <Button
            variant="ghost"
            onClick={onDeleteClick}
            disabled={!swipe.isOpen || !props.canDelete}
            aria-label={props.deleteLabel}
            className="h-full w-full rounded-none text-destructive hover:bg-destructive/15 hover:text-destructive"
          >
            <Trash2 className="size-5" />
          </Button>
        </div>
      )}
      <div
        className={contentClassName}
        style={style}
        onPointerDown={swipe.onPointerDown}
        onPointerMove={swipe.onPointerMove}
        onPointerUp={swipe.onPointerUp}
        onPointerCancel={swipe.onPointerCancel}
        onClickCapture={swipe.onClickCapture}
      >
        {props.children}
      </div>
    </div>
  );
}
