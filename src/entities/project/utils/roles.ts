import {
  MEMBER_ROLES,
  ROLE_FIELD,
  EDIT_ROLES,
  WORK_ROLES,
} from '../constants/roles';
import type { Project } from '../types/project';
import type { ProjectPerson, Abilities } from '../types/roles';
import { ProjectRole } from '../types/roles';

/** Роль человека в проекте; null - не участник */
export function getProjectRole(
  project: Pick<Project, 'owner' | 'editors' | 'contributors' | 'viewers'>,
  userId: string | undefined
): ProjectRole | null {
  if (!userId) {
    return null;
  }

  if (project.owner === userId) {
    return ProjectRole.Owner;
  }

  const memberRole = MEMBER_ROLES.find((role) =>
    (project[ROLE_FIELD[role]] ?? []).includes(userId)
  );

  return memberRole ?? null;
}

/** Люди проекта по порядку ролей: владелец, редакторы, участники, наблюдатели */
export function getProjectPeople(project: Project): ProjectPerson[] {
  const expanded = project.expand;
  const owner: ProjectPerson[] = expanded?.owner
    ? [{ user: expanded.owner, role: ProjectRole.Owner }]
    : [];
  const members = MEMBER_ROLES.flatMap((role) =>
    (expanded?.[ROLE_FIELD[role]] ?? []).map((user): ProjectPerson => ({
      user,
      role,
    }))
  );

  return [...owner, ...members];
}

/** Права роли в проекте; null - ничего */
export function getAbilities(role: ProjectRole | null): Abilities {
  return {
    canEdit: EDIT_ROLES.has(role),
    canWork: WORK_ROLES.has(role),
    canManage: role === ProjectRole.Owner,
  };
}
