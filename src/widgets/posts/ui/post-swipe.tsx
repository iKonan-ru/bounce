import type { ReactNode } from 'react';
import { SwipeRow, ConfirmDialog } from '@/shared/ui';
import { usePostSwipe } from '../hooks/use-post-swipe';
import type { PostSwipeProps } from '../types/post-swipe';

/** Публикация меняет статус вправо, кнопка удаления открывается влево. */
export function PostSwipe(props: PostSwipeProps): ReactNode {
  const state = usePostSwipe(props);

  return (
    <>
      <SwipeRow
        {...state}
        deleteLabel={`Удалить публикацию ${props.post.title}`}
      >
        {props.children}
      </SwipeRow>
      <ConfirmDialog
        open={state.isConfirming}
        onOpenChange={state.setIsConfirming}
        title={`Удалить публикацию "${props.post.title}"?`}
        description="Публикация будет удалена из плана."
        confirmLabel="Удалить"
        isBusy={state.isBusy}
        onConfirm={state.onDeleteConfirm}
      />
    </>
  );
}
