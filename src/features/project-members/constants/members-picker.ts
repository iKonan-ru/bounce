import { MEMBER_ROLES, ROLE_LABEL, ROLE_HINT } from '@/entities/project';
import type { MenuOption } from '@/shared/types';
import type { RoleChoice } from '../types/members-picker';

/** Значение "Нет доступа" в выборе роли */
export const NO_ROLE = 'none';

/** Варианты роли участника: роли по порядку и "Нет доступа" под чертой */
export const ROLE_OPTIONS: readonly MenuOption<RoleChoice>[] = [
  ...MEMBER_ROLES.map((role): MenuOption<RoleChoice> => ({
    value: role,
    label: ROLE_LABEL[role],
    hint: ROLE_HINT[role],
  })),
  { value: NO_ROLE, label: 'Нет доступа', isSeparated: true },
];
