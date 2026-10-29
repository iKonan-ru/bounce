import type { Roles, MemberRole } from '@/entities/project';
import type { User } from '@/entities/user';
import type { NO_ROLE } from '../constants/members-picker';

/** Пропсы выбора участников проекта */
export interface MembersPickerProps {
  /** Владелец проекта: всегда участник, его не снять */
  ownerId: string;
  value: Roles;
  onChange: (roles: Roles) => void;
  /** Только показать роли, без выбора (не владелец проекта) */
  readOnly?: boolean;
  disabled?: boolean;
}

/** Роль участника или "нет доступа" */
export type RoleChoice = MemberRole | typeof NO_ROLE;

/** Пропсы строки участника */
export interface MemberRowProps {
  user: User;
  roles: Roles;
  /** Только показать роль, без выбора */
  readOnly: boolean;
  disabled: boolean;
  onChange: (roles: Roles) => void;
}
