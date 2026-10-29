import type PocketBase from 'pocketbase';
import type { Project } from './model';
import { collection } from './pb';
import { MEMBER_ROLES, type MemberRole, ROLE_FIELD } from './roles';

// люди проекта по ролям, кроме владельца
export type Roles = Partial<Record<MemberRole, string[]>>;

export type NewProject = { name: string; owner: string; roles?: Roles };

// поля проекта со списками ролей: у каждого одна роль, владельца в списках нет
export function roleFields(owner: string, roles: Roles): Record<string, string[]> {
  const seen = new Set([owner]);
  const out: Record<string, string[]> = {};
  for (const role of MEMBER_ROLES) {
    out[ROLE_FIELD[role]] = (roles[role] ?? []).filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
  return out;
}

// Новый проект пустой: шаблон этапов заполняется в его настройках.
export function createProject(client: PocketBase, input: NewProject): Promise<Project> {
  return collection(client, 'projects').create<Project>({
    name: input.name.trim(),
    owner: input.owner,
    ...roleFields(input.owner, input.roles ?? {}),
  });
}
