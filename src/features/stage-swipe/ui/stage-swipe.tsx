import type { ReactNode } from 'react';
import { SwipeRow, ConfirmDialog } from '@/shared/ui';
import { useStageSwipe } from '../hooks/use-stage-swipe';
import type { StageSwipeProps } from '../types/stage-swipe';

/** Свайпы этапов с подтверждением удаления и отменой смены статуса. */
export function StageSwipe(props: StageSwipeProps): ReactNode {
  const state = useStageSwipe(props);

  return (
    <>
      <SwipeRow {...state} deleteLabel={`Удалить этап ${props.stage.title}`}>
        {props.children}
      </SwipeRow>
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
