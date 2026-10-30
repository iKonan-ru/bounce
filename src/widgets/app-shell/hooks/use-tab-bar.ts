import {
  FolderOpen,
  LayoutGrid,
  CalendarCheck,
  MessagesSquare,
} from 'lucide-react';
import {
  projectsQuery,
  getLastProject,
  getProjectRole,
  ProjectDirection,
} from '@/entities/project';
import { useMe } from '@/shared/hooks';
import { readChoice } from '@/shared/utils';
import { useQuery } from '@tanstack/react-query';
import type { TabBarProps, MobileTab } from '../types/app-shell';
import { AppPath, ProjectSection } from '../types/app-shell';

/** Постоянные вкладки; сохраненный проект доступен только его участнику */
export function useTabBar({
  projectId,
  pathname,
  section,
}: TabBarProps): MobileTab[] {
  const me = useMe();
  const projects = useQuery(projectsQuery);
  const rememberedId = projectId ?? getLastProject();
  const project = projects.data?.find(
    (candidate) =>
      candidate.id === rememberedId && getProjectRole(candidate, me?.id)
  );
  const rememberedDirection = readChoice(
    `bounce.direction.${me?.id ?? ''}.${project?.id ?? ''}`,
    (value) => value,
    null
  );
  const isVideo =
    project &&
    (rememberedDirection === ProjectDirection.video ||
      !project.directions.includes(ProjectDirection.music)) &&
    project.directions.includes(ProjectDirection.video);
  const materialLink: MobileTab['link'] = project
    ? {
        to: isVideo ? '/p/$projectId/videos' : '/p/$projectId',
        params: { projectId: project.id },
      }
    : { to: '/projects' };
  const notesLink: MobileTab['link'] = project
    ? { to: '/p/$projectId/notes', params: { projectId: project.id } }
    : { to: '/projects' };

  return [
    {
      label: 'Проекты',
      icon: FolderOpen,
      link: { to: '/projects' },
      isCurrent: pathname === AppPath.Projects,
    },
    {
      label: 'Материалы',
      icon: LayoutGrid,
      link: materialLink,
      isCurrent:
        !!projectId &&
        (section === ProjectSection.Songs || section === ProjectSection.Videos),
    },
    {
      label: 'План',
      icon: CalendarCheck,
      link: { to: '/plan' },
      isCurrent: pathname === AppPath.MyPlan,
    },
    {
      label: 'Заметки',
      icon: MessagesSquare,
      link: notesLink,
      isCurrent: !!projectId && section === ProjectSection.Notes,
    },
  ];
}
