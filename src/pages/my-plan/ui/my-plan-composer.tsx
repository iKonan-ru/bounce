import type { ReactNode } from 'react';
import { MenuSelect, Button } from '@/shared/ui';
import { TaskComposer } from '@/widgets/plan';
import { PostComposer, PostDialog, PublicationDialog } from '@/widgets/posts';
import { useMyPlanComposer } from '../hooks/use-my-plan-composer';
import type { MyPlanComposerProps } from '../types/my-plan';

/** Общая точка создания задач и публикаций с явным выбором проекта */
export function MyPlanComposer(props: MyPlanComposerProps): ReactNode {
  const state = useMyPlanComposer(props);

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-groove/50 p-3">
      <div className="flex flex-wrap gap-3">
        <MenuSelect
          label="Проект"
          value={state.project?.id ?? ''}
          options={state.projectOptions}
          onChange={state.setProject}
        />
        {state.project && (
          <MenuSelect
            label="Добавить"
            value={state.currentKind}
            options={state.options}
            onChange={state.setKind}
          />
        )}
      </div>
      {state.project && state.currentKind === 'task' && (
        <TaskComposer
          key={state.project.id}
          projectId={state.project.id}
          meId={props.meId}
        />
      )}
      {state.project && state.currentKind === 'music' && (
        <PostComposer
          key={state.project.id}
          projectId={state.project.id}
          meId={props.meId}
          onCreated={state.setPost}
        />
      )}
      {state.project && state.currentKind === 'video' && (
        <Button
          variant="ghost"
          className="self-start"
          onClick={state.onVideoOpen}
        >
          Добавить публикацию
        </Button>
      )}
      {state.post && (
        <PostDialog
          post={state.post}
          canWork
          open
          onOpenChange={state.onPostOpenChange}
        />
      )}
      {state.project && state.isVideoOpen && (
        <PublicationDialog
          projectId={state.project.id}
          canWork
          onClose={state.onVideoClose}
        />
      )}
    </div>
  );
}
