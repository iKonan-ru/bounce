import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Loading, EmptyState, BucketedSections, Button } from '@/shared/ui';
import { useContentPlan } from '../hooks/use-content-plan';
import type { ContentPlanProps } from '../types/content-plan';
import { PostComposer } from './post-composer';
import { PostDialog } from './post-dialog';
import { PublicationDialog } from './publication-dialog';

/** Контент-план проекта: публикации по срокам выхода; опубликованные - свёрнуты внизу */
export function ContentPlan({
  projectId,
  meId,
  assigneeId,
  canWork,
}: ContentPlanProps): ReactNode {
  const {
    video,
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
      {canCompose && video.isReleaseEnabled && (
        <PostComposer
          label={video.isVideoEnabled ? 'Новая публикация песни' : undefined}
          projectId={projectId}
          meId={meId}
          onCreated={onPostCreated}
        />
      )}
      {video.canCreate && (
        <Button
          variant="ghost"
          className="justify-start self-start"
          onClick={video.onCreate}
        >
          <Plus className="size-4" />
          {video.isReleaseEnabled ? 'Публикация видео' : 'Добавить публикацию'}
        </Button>
      )}
      {video.isVideoEnabled && video.isError && (
        <p className="text-sm text-led-red">Публикации видео не загрузились.</p>
      )}
      {(video.openId === 'new' || video.openedPost) && (
        <PublicationDialog
          projectId={projectId}
          post={video.openedPost}
          canWork={canWork}
          onClose={video.onClose}
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
