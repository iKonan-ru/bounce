import type { ReactNode } from 'react';
import { ProjectAvatar, AvatarStack } from '@/entities/project';
import type { PageHeaderEdit } from '@/shared/types';
import { PageHeader } from '@/shared/ui';
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
      className="size-20 rounded-xl text-3xl md:size-28 md:text-4xl"
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
  const edit: PageHeaderEdit | undefined = state.canEdit
    ? {
        link: { to: '/p/$projectId/settings', params: { projectId } },
        label: 'Настройки проекта',
      }
    : undefined;

  return (
    <PageHeader
      truncateTitle
      crumbs={PROJECT_CRUMBS}
      media={media}
      title={project?.name ?? ''}
      meta={meta}
      edit={edit}
    />
  );
}
