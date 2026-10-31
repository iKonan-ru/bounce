import {
  FolderOpen,
  LayoutGrid,
  CalendarCheck,
  MessagesSquare,
} from 'lucide-react';
import { getRememberedNotesProject } from '@/entities/note';
import {
  projectsQuery,
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

  const rememberedNotesId = getRememberedNotesProject(me?.id ?? '');
  const notesProject = projects.data?.find(
    (candidate) =>
      candidate.id === rememberedNotesId && getProjectRole(candidate, me?.id)
  );
  const isInNotes = pathname === '/notes' || section === ProjectSection.Notes;
  const notesProjectId = isInNotes ? projectId : notesProject?.id;
  const notesLink: MobileTab['link'] = notesProjectId
    ? { to: '/p/$projectId/notes', params: { projectId: notesProjectId } }
    : { to: '/notes' };

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
      link: { to: '/plan' },
      isCurrent: pathname === AppPath.MyPlan,
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
