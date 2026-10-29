import { projectsQuery } from '@/entities/project';
import { useMe } from '@/shared/hooks';
import { useQuery } from '@tanstack/react-query';
import { useSearch, useNavigate } from '@tanstack/react-router';
import type { UseProjectsPageResult } from '../types/projects';

/** Список проектов и окно нового проекта (открыто, пока в адресе ?create) */
export function useProjectsPage(): UseProjectsPageResult {
  const projects = useQuery(projectsQuery);
  const me = useMe();
  const canCreate = me?.canCreateProjects === true;
  const { create } = useSearch({ from: '/app/projects' });
  const navigate = useNavigate();

  const onCreateOpenChange = (isOpen: boolean): void => {
    if (isOpen) {
      void navigate({
        to: '/projects',
        search: { create: true },
        replace: true,
      });

      return;
    }

    void navigate({ to: '/projects', search: {}, replace: true });
  };

  const onCreateClick = (): void => {
    onCreateOpenChange(true);
  };

  const isCreateRequested = create === true;
  const isCreateOpen = isCreateRequested && canCreate;
  const isLoadFailed = projects.isError && !projects.data;

  return {
    projects: projects.data,
    isPending: projects.isPending,
    isLoadFailed,
    isEmpty: projects.data?.length === 0,
    canCreate,
    isCreateOpen,
    onCreateClick,
    onCreateOpenChange,
  };
}
