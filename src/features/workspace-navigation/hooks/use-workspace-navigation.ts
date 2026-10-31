import { useEffect } from 'react';
import {
  projectsQuery,
  getProjectRole,
  rememberWorkspace,
} from '@/entities/project';
import { useMe, useMediaQuery } from '@/shared/hooks';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { MOBILE_WORKSPACE_QUERY } from '../constants/navigation';

/** Пространство выбирается одинаково в плане и заметках; обзор его не меняет */
export function useWorkspaceNavigation(
  projectId: string,
  section: 'plan' | 'notes',
  isActive = true
) {
  const me = useMe();
  const isMobile = useMediaQuery(MOBILE_WORKSPACE_QUERY);
  const projects = useQuery({ ...projectsQuery, enabled: isMobile });
  const navigate = useNavigate();

  useEffect(() => {
    if (isActive && isMobile && me?.id) {
      rememberWorkspace(me.id, projectId);
    }
  }, [isActive, isMobile, me?.id, projectId]);

  const projectOptions = [
    { value: '', label: 'Личное' },
    ...(projects.data ?? [])
      .filter((project) => getProjectRole(project, me?.id))
      .map((project) => ({ value: project.id, label: project.name })),
  ];
  const onProjectChange = (value: string): void => {
    if (me?.id) {
      rememberWorkspace(me.id, value);
    }

    if (value) {
      void navigate({
        to: section === 'plan' ? '/p/$projectId/plan' : '/p/$projectId/notes',
        params: { projectId: value },
      });
    } else {
      void navigate({ to: section === 'plan' ? '/plan' : '/notes' });
    }
  };

  return { projectOptions, onProjectChange };
}
