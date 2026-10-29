import { toast } from 'sonner';
import type { Project, Roles } from '@/entities/project';
import { getRoleFields, ProjectRole } from '@/entities/project';
import { getCollection, pb, Collections, queryKeys } from '@/shared/api';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import type { UseMembersResult } from '../types/project-settings';

/** Роли участников проекта и их сохранение */
export function useMembers(project: Project): UseMembersResult {
  const queryClient = useQueryClient();
  const saveRoles = useMutation({
    mutationFn: (roles: Roles) =>
      getCollection(pb, Collections.Projects).update(
        project.id,
        getRoleFields(project.owner, roles)
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
    onError: () =>
      toast.error('Участники не сохранились: проверьте соединение'),
  });
  const roles: Roles = {
    [ProjectRole.Editor]: project.editors ?? [],
    [ProjectRole.Contributor]: project.contributors ?? [],
    [ProjectRole.Viewer]: project.viewers ?? [],
  };

  const onRolesChange = (nextRoles: Roles): void => {
    saveRoles.mutate(nextRoles);
  };

  return { roles, isSaving: saveRoles.isPending, onRolesChange };
}
