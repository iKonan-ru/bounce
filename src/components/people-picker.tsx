import { Check, ChevronDown } from 'lucide-react';
import { Avatar, type AvatarUser } from '@/components/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { User } from '@/lib/model';
import { useProjectPeople } from '@/lib/people';
import { cn } from '@/lib/utils';

// Аватары внахлёст: до трёх, остальные - числом.
export function AvatarStack({
  users,
  className,
  max = 3,
  ring = 'ring-panel',
}: {
  users: ReadonlyArray<AvatarUser>;
  className?: string;
  max?: number;
  // цвет обводки - под фон, на котором стоят аватары
  ring?: string;
}) {
  if (users.length === 0) return null;
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <span
      title={users.map((u) => u.name).join(', ')}
      className={cn('flex shrink-0 items-center -space-x-1.5', className)}
    >
      {shown.map((u, i) => (
        <Avatar
          // biome-ignore lint/suspicious/noArrayIndexKey: порядок людей задан списком
          key={u.id ?? i}
          user={u}
          className={cn('size-6 text-[0.625rem] ring-2', ring)}
        />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            'z-10 flex size-6 items-center justify-center rounded-full bg-groove text-[0.625rem] font-medium ring-2',
            ring,
          )}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}

function namesLabel(users: ReadonlyArray<User>): string {
  if (users.length === 0) return 'Никто';
  if (users.length <= 2) return users.map((u) => u.name).join(', ');
  return `${users[0]?.name ?? ''} и ещё ${users.length - 1}`;
}

// Кто делает: несколько человек из проекта. Выбор отмечается сразу, список не закрывается.
export function PeoplePicker({
  projectId,
  value,
  onChange,
  disabled,
  id,
}: {
  projectId: string;
  value: ReadonlyArray<string>;
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  id?: string;
}) {
  // наблюдатели - только если уже назначены
  const people = useProjectPeople(projectId, 'workers', value);
  const chosen = people.filter((u) => value.includes(u.id));
  const toggle = (uid: string) =>
    onChange(value.includes(uid) ? value.filter((x) => x !== uid) : [...value, uid]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          // в подписи - все выбранные: на кнопке видны только два имени
          aria-label={`Кто делает: ${chosen.length ? chosen.map((u) => u.name).join(', ') : 'никто'}`}
          disabled={disabled}
          className={cn(
            '-mr-2 flex h-9 min-w-0 items-center gap-2 rounded-lg px-2 text-left transition-colors hover:bg-groove/60 disabled:opacity-100 disabled:hover:bg-transparent',
            chosen.length === 0 && 'text-dim',
          )}
        >
          <AvatarStack users={chosen} />
          <span className="truncate">{namesLabel(chosen)}</span>
          {!disabled && <ChevronDown className="size-4 shrink-0 text-dim" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        <ul>
          {people.map((u) => {
            const on = value.includes(u.id);
            return (
              <li key={u.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(u.id)}
                  className="flex min-h-10 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm transition-colors hover:bg-groove/60 md:min-h-9"
                >
                  <Avatar user={u} className="size-6 text-[0.625rem]" />
                  <span className="min-w-0 flex-1 truncate">{u.name}</span>
                  <Check
                    className={cn('size-4 transition-opacity', on ? 'opacity-100' : 'opacity-0')}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
