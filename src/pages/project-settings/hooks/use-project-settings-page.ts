import { toast } from 'sonner';
import { projectQuery, useAccess } from '@/entities/project';
import { getCollection, pb, Collections, queryKeys } from '@/shared/api';
import { useProjectCrumbs } from '@/widgets/page-crumbs';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { SETTINGS_ROUTE_ID } from '../constants/project-settings';
import type { UseProjectSettingsPageResult } from '../types/project-settings';

/** Данные и переименование проекта для страницы настроек */
export function useProjectSettingsPage(): UseProjectSettingsPageResult {
  const { projectId } = useParams({ from: SETTINGS_ROUTE_ID });
  const project = useQuery(projectQuery(projectId));
  const crumbs = useProjectCrumbs(projectId);
  const access = useAccess(projectId);
  const queryClient = useQueryClient();
  const renameProject = useMutation({
    mutationFn: (name: string) =>
      getCollection(pb, Collections.Projects).update(projectId, { name }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
    onError: () => toast.error('Название не сохранилось: проверьте соединение'),
  });
  const isOwner = access.canManage;
  const isTitleEditable = isOwner && project.data !== undefined;

  const onNameSave = (name: string): void => {
    renameProject.mutate(name);
  };

  return {
    projectId,
    project: project.data,
    isPending: project.isPending,
    crumbs,
    isOwner,
    canEdit: access.canEdit,
    isTitleEditable,
    name: project.data?.name ?? '',
    onNameSave,
  };
}
