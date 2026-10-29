import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar, type AvatarUser } from '@/components/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { User } from '@/lib/model';
import { PeopleKind, useProjectPeople } from '@/lib/people';
import { cn } from '@/lib/utils';

/** Сколько аватаров видно по умолчанию: остальные - числом */
const DEFAULT_MAX_AVATARS = 3;

/** Сколько имён помещается на кнопке выбора: больше - первое имя и число остальных */
const MAX_LISTED_NAMES = 2;

/** Пропсы аватаров внахлёст */
interface AvatarStackProps {
  users: readonly AvatarUser[];
  className?: string;
  /** Сколько аватаров видно: остальные - числом */
  maxCount?: number;
  /** Цвет обводки - под фон, на котором стоят аватары */
  ringClassName?: string;
}

/** Аватары внахлёст: до трёх, остальные - числом */
export function AvatarStack({
  users,
  className,
  maxCount = DEFAULT_MAX_AVATARS,
  ringClassName = 'ring-panel',
}: AvatarStackProps): ReactNode {
  if (users.length === 0) {
    return null;
  }
  const shownUsers = users.slice(0, maxCount);
  const restCount = users.length - shownUsers.length;
  const hasRest = restCount > 0;
  const names = users.map((user) => user.name).join(', ');
  const stackClassName = cn('flex shrink-0 items-center -space-x-1.5', className);
  const avatarClassName = cn('size-6 text-[0.625rem] ring-2', ringClassName);
  const restClassName = cn(
    'z-10 flex size-6 items-center justify-center rounded-full bg-groove text-[0.625rem] font-medium ring-2',
    ringClassName,
  );
  return (
    <span title={names} className={stackClassName}>
      {shownUsers.map((user, index) => {
        const avatarKey = user.id ?? index;
        return <Avatar key={avatarKey} user={user} className={avatarClassName} />;
      })}
      {hasRest && <span className={restClassName}>+{restCount}</span>}
    </span>
  );
}

/** Имена на кнопке выбора: "Никто", одно-два имени или первое имя и число остальных */
function getNamesLabel(users: readonly User[]): string {
  if (users.length === 0) {
    return 'Никто';
  }
  if (users.length <= MAX_LISTED_NAMES) {
    return users.map((user) => user.name).join(', ');
  }
  const firstName = users[0]?.name ?? '';
  const restCount = users.length - 1;
  return `${firstName} и ещё ${restCount}`;
}

/** Пропсы выбора исполнителей */
interface PeoplePickerProps {
  projectId: string;
  /** Id выбранных людей */
  value: readonly string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  id?: string;
}

/** Состояние и действия выбора исполнителей */
interface UsePeoplePickerResult {
  /** Кого можно выбрать */
  people: User[];
  chosenUsers: User[];
  hasChosen: boolean;
  /** Подпись кнопки для экранного диктора */
  triggerLabel: string;
  /** Имена на кнопке */
  namesLabel: string;
  handlePersonToggle: (userId: string) => void;
}

/** Выбор исполнителей: кого можно выбрать, кто выбран и переключение */
function usePeoplePicker({
  projectId,
  value,
  onChange,
}: Pick<PeoplePickerProps, 'projectId' | 'value' | 'onChange'>): UsePeoplePickerResult {
  // наблюдатели - только если уже назначены
  const people = useProjectPeople(projectId, PeopleKind.Workers, value);
  const chosenUsers = people.filter((user) => value.includes(user.id));
  const hasChosen = chosenUsers.length > 0;
  const chosenNames = chosenUsers.map((user) => user.name).join(', ');
  const chosenLabel = hasChosen ? chosenNames : 'никто';
  // в подписи - все выбранные: на кнопке видны только два имени
  const triggerLabel = `Кто делает: ${chosenLabel}`;

  const handlePersonToggle = (userId: string): void => {
    if (value.includes(userId)) {
      onChange(value.filter((chosenId) => chosenId !== userId));
      return;
    }
    onChange([...value, userId]);
  };

  return {
    people,
    chosenUsers,
    hasChosen,
    triggerLabel,
    namesLabel: getNamesLabel(chosenUsers),
    handlePersonToggle,
  };
}

/** Кто делает: несколько человек из проекта; выбор отмечается сразу, список не закрывается */
export function PeoplePicker({
  projectId,
  value,
  onChange,
  disabled,
  id,
}: PeoplePickerProps): ReactNode {
  const { people, chosenUsers, hasChosen, triggerLabel, namesLabel, handlePersonToggle } =
    usePeoplePicker({ projectId, value, onChange });
  const triggerClassName = cn(
    '-mr-2 flex h-9 min-w-0 items-center gap-2 rounded-lg px-2 text-left transition-colors hover:bg-groove/60 disabled:opacity-100 disabled:hover:bg-transparent',
    { 'text-dim': !hasChosen },
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-label={triggerLabel}
          disabled={disabled}
          className={triggerClassName}
        >
          <AvatarStack users={chosenUsers} />
          <span className="truncate">{namesLabel}</span>
          {!disabled && <ChevronDown className="size-4 shrink-0 text-dim" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        <ul>
          {people.map((user) => (
            <PersonOption
              key={user.id}
              user={user}
              chosenIds={value}
              onToggle={handlePersonToggle}
            />
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** Пропсы человека в списке выбора */
interface PersonOptionProps {
  user: User;
  /** Id выбранных людей */
  chosenIds: readonly string[];
  onToggle: (userId: string) => void;
}

/** Человек в списке выбора: аватар, имя и галочка, если выбран */
function PersonOption({ user, chosenIds, onToggle }: PersonOptionProps): ReactNode {
  const isChosen = chosenIds.includes(user.id);
  const onOptionClick = (): void => {
    onToggle(user.id);
  };
  const checkClassName = cn('size-4 transition-opacity', {
    'opacity-100': isChosen,
    'opacity-0': !isChosen,
  });
  return (
    <li>
      <button
        type="button"
        aria-pressed={isChosen}
        onClick={onOptionClick}
        className="flex min-h-10 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm transition-colors hover:bg-groove/60 md:min-h-9"
      >
        <Avatar user={user} className="size-6 text-[0.625rem]" />
        <span className="min-w-0 flex-1 truncate">{user.name}</span>
        <Check className={checkClassName} />
      </button>
    </li>
  );
}
