import { useQuery } from '@tanstack/react-query';
import { useMe } from './auth';
import { projectQuery } from './queries';
import { type Abilities, getAbilities, getProjectRole, type ProjectRole } from './roles';

/** Права текущего пользователя в проекте вместе с его ролью */
export interface Access extends Abilities {
  /** Роль в проекте; null - не участник или проект ещё не загружен */
  role: ProjectRole | null;
}

/** Роль текущего пользователя в проекте и что ему можно. Пока проект не загружен - ничего */
export function useAccess(projectId: string): Access {
  const me = useMe();
  const project = useQuery(projectQuery(projectId));
  const role = project.data ? getProjectRole(project.data, me?.id) : null;
  return { role, ...getAbilities(role) };
}
