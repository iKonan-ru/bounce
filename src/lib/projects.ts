import type PocketBase from 'pocketbase';
import type { Project } from './model';
import { Collections, getCollection } from './pb';
import { MEMBER_ROLES, type MemberRole, ROLE_FIELD } from './roles';

/** Люди проекта по ролям, кроме владельца */
export type Roles = Partial<Record<MemberRole, string[]>>;

/** Новый проект */
export interface NewProject {
  name: string;
  owner: string;
  roles?: Roles;
}

/** Поля проекта со списками ролей: у каждого одна роль, владельца в списках нет */
export function getRoleFields(owner: string, roles: Roles): Record<string, string[]> {
  const seenIds = new Set([owner]);
  const checkIsFirstSeen = (id: string): boolean => {
    if (seenIds.has(id)) {
      return false;
    }
    seenIds.add(id);
    return true;
  };
  return Object.fromEntries(
    MEMBER_ROLES.map((role) => [ROLE_FIELD[role], (roles[role] ?? []).filter(checkIsFirstSeen)]),
  );
}

/** Новый проект пустой: шаблон этапов заполняется в его настройках */
export function createProject(client: PocketBase, input: NewProject): Promise<Project> {
  return getCollection(client, Collections.Projects).create<Project>({
    name: input.name.trim(),
    owner: input.owner,
    ...getRoleFields(input.owner, input.roles ?? {}),
  });
}
