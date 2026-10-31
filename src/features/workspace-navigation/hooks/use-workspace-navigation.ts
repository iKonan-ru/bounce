import { projectsQuery, getProjectRole } from '@/entities/project';
import { useMe, useMediaQuery } from '@/shared/hooks';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { MOBILE_WORKSPACE_QUERY } from '../constants/navigation';

/** Переключение проекта сохраняет открытый раздел на мобильном */
export function useWorkspaceNavigation(section: 'plan' | 'notes') {
  const me = useMe();
  const isMobile = useMediaQuery(MOBILE_WORKSPACE_QUERY);
  const projects = useQuery({ ...projectsQuery, enabled: isMobile });
  const navigate = useNavigate();
  const projectOptions = (projects.data ?? [])
    .filter((project) => getProjectRole(project, me?.id))
    .map((project) => ({ value: project.id, label: project.name }));
  const onProjectChange = (value: string): void => {
    void navigate({
      to: section === 'plan' ? '/p/$projectId/plan' : '/p/$projectId/notes',
      params: { projectId: value },
    });
  };

  return { projectOptions, onProjectChange };
}
