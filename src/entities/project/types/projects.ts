import type { MemberRole } from './roles';

/** Люди проекта по ролям, кроме владельца */
export type Roles = Partial<Record<MemberRole, string[]>>;

/** Новый проект */
export interface NewProject {
  name: string;
  owner: string;
  roles?: Roles;
}
