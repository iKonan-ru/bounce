import type { ReactNode } from 'react';
import { Loading, EmptyState, BucketedSections } from '@/shared/ui';
import { useContentPlan } from '../hooks/use-content-plan';
import type { ContentPlanProps } from '../types/content-plan';
import { PostComposer } from './post-composer';
import { PostDialog } from './post-dialog';

/** Контент-план проекта: публикации по срокам выхода; опубликованные - свёрнуты внизу */
export function ContentPlan({
  projectId,
  meId,
  assigneeId,
  canWork,
}: ContentPlanProps): ReactNode {
  const {
    groups,
    published,
    openedPost,
    isLoading,
    showEmpty,
    emptyText,
    renderPost,
    onPostCreated,
    onDialogOpenChange,
  } = useContentPlan({ projectId, meId, assigneeId, canWork });
  // проверка здесь, а не в хуке: так TypeScript знает, что meId есть
  const canCompose = canWork && !!meId;

  return (
    <div className="flex flex-col gap-8">
      {canCompose && (
        <PostComposer
          projectId={projectId}
          meId={meId}
          onCreated={onPostCreated}
        />
      )}
      {isLoading && <Loading className="h-40 rounded-xl" />}
      {showEmpty && <EmptyState>{emptyText}</EmptyState>}
      <BucketedSections
        groups={groups}
        noneLabel="Без даты"
        renderItem={renderPost}
        done={published}
        doneLabel="Опубликовано"
        renderDone={renderPost}
      />
      {openedPost && (
        <PostDialog
          post={openedPost}
          canWork={canWork}
          open
          onOpenChange={onDialogOpenChange}
        />
      )}
    </div>
  );
}
