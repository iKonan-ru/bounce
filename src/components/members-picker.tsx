import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { usersQuery } from '@/lib/queries';

type Props = {
  ownerId: string;
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

// Кто из заведённых пользователей видит проект. Владелец - всегда, его не снять.
export function MembersPicker({ ownerId, value, onChange, disabled }: Props) {
  const users = useQuery(usersQuery);
  const others = (users.data ?? []).filter((u) => u.id !== ownerId);
  const owner = users.data?.find((u) => u.id === ownerId);

  return (
    <ul className="flex flex-col">
      {owner && (
        <li className="flex items-center gap-3 py-2">
          <Avatar name={owner.name} />
          <span className="flex-1">
            {owner.name} <span className="text-dim">@{owner.username}</span>
          </span>
          <span className="text-xs text-dim">владелец</span>
        </li>
      )}
      {others.map((u) => {
        const id = `member-${u.id}`;
        const checked = value.includes(u.id);
        return (
          <li key={u.id}>
            <label htmlFor={id} className="flex min-h-12 items-center gap-3 py-2">
              <Avatar name={u.name} />
              <span className="flex-1">
                {u.name} <span className="text-dim">@{u.username}</span>
              </span>
              <Checkbox
                id={id}
                className="size-5"
                checked={checked}
                disabled={disabled}
                onCheckedChange={(v) =>
                  onChange(v === true ? [...value, u.id] : value.filter((m) => m !== u.id))
                }
              />
            </label>
          </li>
        );
      })}
      {users.isSuccess && others.length === 0 && (
        <li className="py-2 text-sm text-dim">Других пользователей пока нет</li>
      )}
    </ul>
  );
}
