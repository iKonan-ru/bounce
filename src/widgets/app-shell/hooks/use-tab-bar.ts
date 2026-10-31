import {
  FolderOpen,
  LayoutGrid,
  CalendarCheck,
  MessagesSquare,
} from 'lucide-react';
import {
  projectsQuery,
  getRememberedWorkspace,
  getLastProject,
  getProjectRole,
  ProjectDirection,
  getMaterialDirection,
  getRememberedDirection,
} from '@/entities/project';
import { useMe } from '@/shared/hooks';
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
  const isVideo =
    project &&
    getMaterialDirection(
      project,
      getRememberedDirection(me?.id ?? '', project.id)
    ) === ProjectDirection.video;
  const materialLink: MobileTab['link'] = project
    ? {
        to: isVideo ? '/p/$projectId/videos' : '/p/$projectId/songs',
        params: { projectId: project.id },
      }
    : { to: '/projects' };

  const rememberedWorkspaceId = getRememberedWorkspace(me?.id ?? '');
  const workspaceProject = projects.data?.find(
    (candidate) =>
      candidate.id === rememberedWorkspaceId &&
      getProjectRole(candidate, me?.id)
  );
  const isInWorkspace =
    pathname === '/notes' ||
    pathname === '/plan' ||
    section === ProjectSection.Notes ||
    section === ProjectSection.Plan;
  const workspaceId = isInWorkspace ? projectId : workspaceProject?.id;
  const notesLink: MobileTab['link'] = workspaceId
    ? { to: '/p/$projectId/notes', params: { projectId: workspaceId } }
    : { to: '/notes' };

  let planLink: MobileTab['link'] = workspaceId
    ? { to: '/p/$projectId/plan', params: { projectId: workspaceId } }
    : { to: '/plan' };

  if (pathname === '/plan/overview') {
    planLink = { to: '/plan/overview' };
  }

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
        (section === ProjectSection.Songs ||
          section === ProjectSection.Videos ||
          section === ProjectSection.Settings),
    },
    {
      label: 'План',
      icon: CalendarCheck,
      link: planLink,
      isCurrent:
        pathname === AppPath.MyPlan ||
        pathname === '/plan/overview' ||
        (!!projectId && section === ProjectSection.Plan),
    },
    {
      label: 'Заметки',
      icon: MessagesSquare,
      link: notesLink,
      isCurrent:
        pathname === '/notes' ||
        (!!projectId && section === ProjectSection.Notes),
    },
  ];
}
