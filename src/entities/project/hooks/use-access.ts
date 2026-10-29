import { useMe } from '@/shared/hooks';
import { useQuery } from '@tanstack/react-query';
import { projectQuery } from '../api/queries';
import type { Access } from '../types/access';
import { getProjectRole, getAbilities } from '../utils/roles';

/** Роль текущего пользователя в проекте и что ему можно. Пока проект не загружен - ничего */
export function useAccess(projectId: string): Access {
  const me = useMe();
  const project = useQuery(projectQuery(projectId));
  const role = project.data ? getProjectRole(project.data, me?.id) : null;

  return { role, ...getAbilities(role) };
}
