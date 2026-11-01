import {
  FolderOpen,
  Disc3,
  Film,
  ListChecks,
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
import { useQuery } from '@tanstack/react-query';
import type { TabBarProps, MobileTab } from '../types/app-shell';
import { AppPath, ProjectSection } from '../types/app-shell';

/** Вкладки направлений выбранного проекта; сохраненный проект доступен только участнику */
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
  const notesLink: MobileTab['link'] = project
    ? { to: '/p/$projectId/notes', params: { projectId: project.id } }
    : { to: '/projects' };
  const planLink: MobileTab['link'] = project
    ? { to: '/p/$projectId/plan', params: { projectId: project.id } }
    : { to: '/projects' };

  const items: MobileTab[] = [
    {
      label: project?.name ?? 'Проекты',
      project,
      icon: FolderOpen,
      link: { to: '/projects' },
      isCurrent: pathname === AppPath.Projects,
    },
  ];

  if (project?.directions.includes(ProjectDirection.music)) {
    items.push({
      label: 'Музыка',
      icon: Disc3,
      link: { to: '/p/$projectId/songs', params: { projectId: project.id } },
      isCurrent: !!projectId && section === ProjectSection.Songs,
    });
  }

  if (project?.directions.includes(ProjectDirection.video)) {
    items.push({
      label: 'Видео',
      icon: Film,
      link: { to: '/p/$projectId/videos', params: { projectId: project.id } },
      isCurrent: !!projectId && section === ProjectSection.Videos,
    });
  }

  if (project?.directions.includes(ProjectDirection.other)) {
    items.push({
      label: 'Задачи',
      icon: ListChecks,
      link: { to: '/p/$projectId/tasks', params: { projectId: project.id } },
      isCurrent: !!projectId && section === ProjectSection.Tasks,
    });
  }

  items.push(
    {
      label: 'План',
      icon: CalendarCheck,
      link: planLink,
      isCurrent: !!projectId && section === ProjectSection.Plan,
    },
    {
      label: 'Заметки',
      icon: MessagesSquare,
      link: notesLink,
      isCurrent: !!projectId && section === ProjectSection.Notes,
    }
  );

  return items;
}
