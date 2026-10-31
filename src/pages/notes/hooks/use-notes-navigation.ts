import { useEffect } from 'react';
import { rememberNotesProject } from '@/entities/note';
import { projectsQuery, getProjectRole } from '@/entities/project';
import { useMe, useMediaQuery } from '@/shared/hooks';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { MOBILE_NOTES_QUERY } from '../constants/notes';

/** На телефоне переключаются отдельные страницы заметок, без общей ленты */
export function useNotesNavigation(projectId: string) {
  const me = useMe();
  const isMobile = useMediaQuery(MOBILE_NOTES_QUERY);
  const projects = useQuery({ ...projectsQuery, enabled: isMobile });
  const navigate = useNavigate();

  useEffect(() => {
    if (isMobile && me?.id) {
      rememberNotesProject(me.id, projectId);
    }
  }, [isMobile, me?.id, projectId]);

  const projectOptions = [
    { value: '', label: 'Личные' },
    ...(projects.data ?? [])
      .filter((project) => getProjectRole(project, me?.id))
      .map((project) => ({ value: project.id, label: project.name })),
  ];
  const onProjectChange = (value: string): void => {
    if (me?.id) {
      rememberNotesProject(me.id, value);
    }

    if (value) {
      void navigate({
        to: '/p/$projectId/notes',
        params: { projectId: value },
      });
    } else {
      void navigate({ to: '/notes' });
    }
  };

  return { projectOptions, onProjectChange };
}
