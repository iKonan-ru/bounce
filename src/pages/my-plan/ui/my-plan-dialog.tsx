import type { ReactNode } from 'react';
import { TaskDialog, StageDialog, PlanItemKind } from '@/widgets/plan';
import { PostDialog, PublicationDialog } from '@/widgets/posts';
import type { MyPlanDialogProps } from '../types/my-plan';

/** Права берутся из проекта исходной записи, назначение не дает прав редактирования */
export function MyPlanDialog({ entry, onClose }: MyPlanDialogProps): ReactNode {
  const onOpenChange = (open: boolean): void => {
    if (!open) {
      onClose();
    }
  };

  if (entry.kind === 'music') {
    return (
      <PostDialog
        post={entry.post}
        canWork={entry.canWork}
        open
        onOpenChange={onOpenChange}
      />
    );
  }

  if (entry.kind === 'video') {
    return (
      <PublicationDialog
        projectId={entry.project.id}
        post={entry.post}
        canWork={entry.canWork}
        onClose={onClose}
      />
    );
  }

  const { item } = entry;

  if (item.kind === PlanItemKind.Task) {
    return (
      <TaskDialog
        task={item.task}
        canWork={entry.canWork}
        open
        onOpenChange={onOpenChange}
      />
    );
  }

  if (item.kind === PlanItemKind.VideoStage) {
    return (
      <StageDialog
        stage={item.stage}
        video={item.video}
        projectId={entry.project.id}
        canWork={entry.canWork}
        open
        onOpenChange={onOpenChange}
      />
    );
  }

  return (
    <StageDialog
      stage={item.stage}
      song={item.song}
      projectId={entry.project.id}
      canWork={entry.canWork}
      open
      onOpenChange={onOpenChange}
    />
  );
}
