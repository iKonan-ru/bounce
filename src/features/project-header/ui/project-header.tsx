import { Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import { ProjectAvatar, AvatarStack } from '@/entities/project';
import { PageHeader, Button } from '@/shared/ui';
import { Link } from '@tanstack/react-router';
import { PROJECT_CRUMBS, PEOPLE_SHOWN_MAX } from '../constants/project-header';
import { useProjectHeader } from '../hooks/use-project-header';
import type { ProjectHeaderProps } from '../types/project-header';

/** Название, аватар, участники и настройки принадлежат проекту, а не направлению */
export function ProjectHeader(props: ProjectHeaderProps): ReactNode {
  const { project, projectId } = props;
  const state = useProjectHeader(props);
  const media = project && (
    <ProjectAvatar
      project={project}
      isInteractive
      onPick={state.onAvatarPick}
      pending={state.pendingAvatar}
      className="size-12 rounded-xl text-lg"
    />
  );
  const meta = state.people.length > 0 && (
    <AvatarStack
      users={state.people}
      maxCount={PEOPLE_SHOWN_MAX}
      ringClassName="ring-console"
      className="mt-1"
    />
  );
  const actions = state.canEdit && (
    <Button asChild variant="ghost" size="icon" className="text-dim">
      <Link
        to="/p/$projectId/settings"
        params={{ projectId }}
        aria-label="Настройки проекта"
        title="Настройки проекта"
      >
        <Settings className="size-5" />
      </Link>
    </Button>
  );

  return (
    <PageHeader
      crumbs={PROJECT_CRUMBS}
      media={media}
      title={project?.name ?? ''}
      meta={meta}
      actions={actions}
    />
  );
}
