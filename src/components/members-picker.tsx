import type { ReactNode } from 'react';
import type { User } from '@/lib/model';
import type { Roles } from '@/lib/projects';
import { usersQuery } from '@/lib/queries';
import type { MemberRole } from '@/lib/roles';
import { MEMBER_ROLES, ROLE_LABEL, ROLE_HINT, ProjectRole } from '@/lib/roles';
import { GROUP_ROWS } from '@/shared/constants';
import type { MenuOption } from '@/shared/types';
import { Avatar, MenuSelect } from '@/shared/ui';
import { useQuery } from '@tanstack/react-query';

/** Пропсы выбора участников проекта */
interface MembersPickerProps {
  /** Владелец проекта: всегда участник, его не снять */
  ownerId: string;
  value: Roles;
  onChange: (roles: Roles) => void;
  /** Только показать роли, без выбора (не владелец проекта) */
  readOnly?: boolean;
  disabled?: boolean;
}

/** Значение "Нет доступа" в выборе роли */
const NO_ROLE = 'none';

/** Роль участника или "нет доступа" */
type RoleChoice = MemberRole | typeof NO_ROLE;

/** Варианты роли участника: роли по порядку и "Нет доступа" под чертой */
const ROLE_OPTIONS: readonly MenuOption<RoleChoice>[] = [
  ...MEMBER_ROLES.map((role): MenuOption<RoleChoice> => ({
    value: role,
    label: ROLE_LABEL[role],
    hint: ROLE_HINT[role],
  })),
  { value: NO_ROLE, label: 'Нет доступа', isSeparated: true },
];

/** Роль пользователя в проекте; без роли - "нет доступа" */
function getMemberRole(roles: Roles, userId: string): RoleChoice {
  return (
    MEMBER_ROLES.find((role) => (roles[role] ?? []).includes(userId)) ?? NO_ROLE
  );
}

/** Роли проекта, где у пользователя новая роль (или нет доступа) */
function getRolesWithMember(
  roles: Roles,
  userId: string,
  roleChoice: RoleChoice
): Roles {
  const nextRoles: Roles = {};
  for (const role of MEMBER_ROLES) {
    const otherIds = (roles[role] ?? []).filter(
      (memberId) => memberId !== userId
    );
    const idsWithUser = [...otherIds, userId];
    const isChosenRole = role === roleChoice;
    nextRoles[role] = isChosenRole ? idsWithUser : otherIds;
  }

  return nextRoles;
}

/**
 * Пользователи в списке, кроме владельца: участники - всегда, остальные - только если роль
 * можно выбрать
 *
 * Отключённых не добавить, но уже участника видно - роль можно снять
 */
function getListedUsers(
  users: readonly User[],
  ownerId: string,
  roles: Roles,
  readOnly: boolean
): User[] {
  const checkIsListed = (user: User): boolean => {
    if (user.id === ownerId) {
      return false;
    }

    const hasRole = getMemberRole(roles, user.id) !== NO_ROLE;

    if (hasRole) {
      return true;
    }

    const canAdd = !readOnly && !user.disabled;

    return canAdd;
  };

  return users.filter(checkIsListed);
}

/** Кто из заведённых пользователей видит проект и с какой ролью; владелец - всегда, его не снять */
export function MembersPicker({
  ownerId,
  value,
  onChange,
  readOnly = false,
  disabled = false,
}: MembersPickerProps): ReactNode {
  const users = useQuery(usersQuery);
  const owner = users.data?.find((user) => user.id === ownerId);
  const others = getListedUsers(users.data ?? [], ownerId, value, readOnly);
  const isEmpty = users.isSuccess && others.length === 0;

  return (
    <ul className={GROUP_ROWS}>
      {owner && (
        <li className="flex min-h-12 items-center gap-3 px-4 py-2">
          <Avatar user={owner} className="size-7 text-xs" />
          <span className="min-w-0 flex-1 truncate">
            {owner.name} <span className="text-dim">@{owner.username}</span>
          </span>
          <span className="text-sm text-dim">
            {ROLE_LABEL[ProjectRole.Owner]}
          </span>
        </li>
      )}
      {others.map((user) => (
        <MemberRow
          key={user.id}
          user={user}
          roles={value}
          readOnly={readOnly}
          disabled={disabled}
          onChange={onChange}
        />
      ))}
      {isEmpty && (
        <li className="px-4 py-3 text-sm text-dim">
          {readOnly ? 'Других участников нет' : 'Других пользователей пока нет'}
        </li>
      )}
    </ul>
  );
}

/** Пропсы строки участника */
interface MemberRowProps {
  user: User;
  roles: Roles;
  /** Только показать роль, без выбора */
  readOnly: boolean;
  disabled: boolean;
  onChange: (roles: Roles) => void;
}

/** Участник: аватар, имя и роль - текстом или выбором */
function MemberRow({
  user,
  roles,
  readOnly,
  disabled,
  onChange,
}: MemberRowProps): ReactNode {
  const role = getMemberRole(roles, user.id);
  const hasNoRole = role === NO_ROLE;
  const roleLabel = hasNoRole ? '' : ROLE_LABEL[role];
  const roleMenuLabel = `Роль: ${user.name}`;
  const onRoleChange = (roleChoice: RoleChoice): void => {
    onChange(getRolesWithMember(roles, user.id, roleChoice));
  };

  return (
    <li className="flex min-h-12 items-center gap-3 px-4 py-2">
      <Avatar user={user} className="size-7 text-xs" />
      <span className="min-w-0 flex-1 truncate">
        {user.name} <span className="text-dim">@{user.username}</span>
        {user.disabled && <span className="text-dim"> · отключён</span>}
      </span>
      {readOnly ? (
        <span className="text-sm text-dim">{roleLabel}</span>
      ) : (
        <MenuSelect
          label={roleMenuLabel}
          value={role}
          isDim={hasNoRole}
          disabled={disabled}
          onChange={onRoleChange}
          options={ROLE_OPTIONS}
        />
      )}
    </li>
  );
}
