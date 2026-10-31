import { Check, Play, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, ConfirmDialog } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { ADVANCE_THRESHOLD } from '../constants/swipe';
import { useStageSwipe } from '../hooks/use-stage-swipe';
import { useSwipeGesture } from '../hooks/use-swipe-gesture';
import type { StageSwipeProps } from '../types/stage-swipe';

/** Строка остается обычной, действия видны только во время свайпа */
export function StageSwipe(props: StageSwipeProps): ReactNode {
  const state = useStageSwipe(props);
  const swipe = useSwipeGesture(state);
  const contentClassName = cn('relative bg-panel', {
    'touch-pan-y touch-pinch-zoom': state.canAdvance || state.canDelete,
    'motion-safe:transition-transform motion-safe:duration-200':
      !swipe.isDragging,
  });
  const advanceClassName = cn(
    'absolute inset-y-0 left-0 flex w-28 flex-col items-center justify-center gap-1 text-xs',
    {
      'bg-led-green/20 text-led-green': state.isFinishing,
      'bg-led-amber/20 text-led-amber': !state.isFinishing,
      'opacity-60': swipe.offset < ADVANCE_THRESHOLD,
    }
  );
  const AdvanceIcon = state.isFinishing ? Check : Play;
  const style = { transform: `translateX(${swipe.offset}px)` };

  const onDeleteClick = (): void => {
    swipe.close();
    state.onDeleteClick();
  };

  return (
    <>
      <div
        ref={swipe.rootRef}
        className="relative overflow-hidden"
        onKeyDown={swipe.onKeyDown}
      >
        {swipe.offset > 0 && (
          <div className={advanceClassName} aria-hidden="true">
            <AdvanceIcon className="size-5" />
            {state.advanceLabel}
          </div>
        )}
        {swipe.offset < 0 && (
          <div className="absolute inset-y-0 right-0 w-20 bg-destructive/10">
            <Button
              variant="ghost"
              onClick={onDeleteClick}
              disabled={!swipe.isOpen || !state.canDelete}
              aria-label={`Удалить этап ${props.stage.title}`}
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
      <ConfirmDialog
        open={state.isConfirming}
        onOpenChange={state.setIsConfirming}
        title={`Удалить этап "${props.stage.title}"?`}
        description="Заметки этапа удалятся вместе с ним."
        confirmLabel="Удалить"
        isBusy={state.isBusy}
        onConfirm={state.onDeleteConfirm}
      />
    </>
  );
}
