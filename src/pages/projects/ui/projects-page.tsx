import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  getProjectPeople,
  ProjectAvatar,
  AvatarStack,
} from '@/entities/project';
import { Button, PageHeader, Loading, EmptyState } from '@/shared/ui';
import { Link } from '@tanstack/react-router';
import {
  PROJECT_CARD_CLASS_NAME,
  CARD_AVATARS_MAX,
  NO_CRUMBS,
} from '../constants/projects';
import { useProjectsPage } from '../hooks/use-projects-page';
import type { ProjectCardProps } from '../types/projects';
import { NewProjectDialog } from './new-project-dialog';

/** Карточка проекта: аватар, название и участники */
function ProjectCard({ project }: ProjectCardProps): ReactNode {
  const people = getProjectPeople(project).map((person) => person.user);
  const linkParams = { projectId: project.id };

  return (
    <li>
      <Link
        to="/p/$projectId"
        params={linkParams}
        className={PROJECT_CARD_CLASS_NAME}
      >
        <ProjectAvatar
          project={project}
          className="size-12 rounded-xl text-lg"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{project.name}</span>
          <AvatarStack
            users={people}
            maxCount={CARD_AVATARS_MAX}
            className="mt-1.5"
          />
        </span>
      </Link>
    </li>
  );
}

/** Список проектов */
export function ProjectsPage(): ReactNode {
  const {
    projects,
    isPending,
    isLoadFailed,
    isEmpty,
    canCreate,
    isCreateOpen,
    onCreateClick,
    onCreateOpenChange,
  } = useProjectsPage();

  const createButton = canCreate && (
    <Button onClick={onCreateClick}>
      <Plus data-icon="inline-start" />
      Новый проект
    </Button>
  );

  return (
    <>
      <PageHeader crumbs={NO_CRUMBS} title="Проекты" actions={createButton} />
      {isPending && <Loading className="h-20 rounded-xl" />}
      {isLoadFailed && <p className="text-led-red">Проекты не загрузились.</p>}
      {isEmpty && <EmptyState>Проектов пока нет</EmptyState>}
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {projects?.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </ul>
      <NewProjectDialog open={isCreateOpen} onOpenChange={onCreateOpenChange} />
    </>
  );
}
