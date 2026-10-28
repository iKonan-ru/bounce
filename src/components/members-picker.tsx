import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/avatar';
import { MenuSelect } from '@/components/menu-select';
import { GROUP_ROWS } from '@/components/page';
import { MEMBER_ROLES, type MemberRole, ROLE_HINT, ROLE_LABEL } from '@/lib/model';
import type { Roles } from '@/lib/projects';
import { usersQuery } from '@/lib/queries';

type Props = {
  ownerId: string;
  value: Roles;
  onChange: (roles: Roles) => void;
  // только показать роли, без выбора (не владелец проекта)
  readOnly?: boolean;
  disabled?: boolean;
};

const NONE = 'none';

function roleOf(roles: Roles, id: string): MemberRole | typeof NONE {
  return MEMBER_ROLES.find((r) => roles[r]?.includes(id)) ?? NONE;
}

function withRole(roles: Roles, id: string, role: MemberRole | typeof NONE): Roles {
  const next: Roles = {};
  for (const r of MEMBER_ROLES) {
    const rest = (roles[r] ?? []).filter((x) => x !== id);
    next[r] = r === role ? [...rest, id] : rest;
  }
  return next;
}

// Кто из заведённых пользователей видит проект и с какой ролью. Владелец - всегда, его не снять.
export function MembersPicker({ ownerId, value, onChange, readOnly, disabled }: Props) {
  const users = useQuery(usersQuery);
  const owner = users.data?.find((u) => u.id === ownerId);
  const others = (users.data ?? []).filter(
    (u) => u.id !== ownerId && (!readOnly || roleOf(value, u.id) !== NONE),
  );

  return (
    <ul className={GROUP_ROWS}>
      {owner && (
        <li className="flex min-h-12 items-center gap-3 px-4 py-2">
          <Avatar user={owner} className="size-7 text-xs" />
          <span className="min-w-0 flex-1 truncate">
            {owner.name} <span className="text-dim">@{owner.username}</span>
          </span>
          <span className="text-sm text-dim">{ROLE_LABEL.owner}</span>
        </li>
      )}
      {others.map((u) => {
        const role = roleOf(value, u.id);
        return (
          <li key={u.id} className="flex min-h-12 items-center gap-3 px-4 py-2">
            <Avatar user={u} className="size-7 text-xs" />
            <span className="min-w-0 flex-1 truncate">
              {u.name} <span className="text-dim">@{u.username}</span>
            </span>
            {readOnly ? (
              <span className="text-sm text-dim">{role === NONE ? '' : ROLE_LABEL[role]}</span>
            ) : (
              <MenuSelect
                label={`Роль: ${u.name}`}
                value={role}
                dim={role === NONE}
                disabled={disabled ?? false}
                onChange={(v) =>
                  onChange(withRole(value, u.id, MEMBER_ROLES.find((r) => r === v) ?? NONE))
                }
                options={[
                  ...MEMBER_ROLES.map((r) => ({
                    value: r,
                    label: ROLE_LABEL[r],
                    hint: ROLE_HINT[r],
                  })),
                  { value: NONE, label: 'Нет доступа', separated: true },
                ]}
              />
            )}
          </li>
        );
      })}
      {users.isSuccess && others.length === 0 && (
        <li className="px-4 py-3 text-sm text-dim">
          {readOnly ? 'Других участников нет' : 'Других пользователей пока нет'}
        </li>
      )}
    </ul>
  );
}
