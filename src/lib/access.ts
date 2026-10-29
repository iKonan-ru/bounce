import { useQuery } from '@tanstack/react-query';
import { useMe } from './auth';
import { projectQuery } from './queries';
import { type Abilities, abilities, type ProjectRole, projectRole } from './roles';

// Роль текущего пользователя в проекте и что ему можно. Пока проект не загружен - ничего.
export function useAccess(projectId: string): Abilities & { role: ProjectRole | null } {
  const me = useMe();
  const project = useQuery(projectQuery(projectId));
  const role = project.data ? projectRole(project.data, me?.id) : null;
  return { role, ...abilities(role) };
}
