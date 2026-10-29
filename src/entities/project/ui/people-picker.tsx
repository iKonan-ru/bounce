import { ChevronDown, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { Popover, PopoverTrigger, PopoverContent, Avatar } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { usePeoplePicker } from '../hooks/use-people-picker';
import type {
  PeoplePickerProps,
  PersonOptionProps,
} from '../types/people-picker';
import { AvatarStack } from './avatar-stack';

/** Кто делает: несколько человек из проекта; выбор отмечается сразу, список не закрывается */
export function PeoplePicker({
  projectId,
  value,
  onChange,
  disabled,
  id,
}: PeoplePickerProps): ReactNode {
  const {
    people,
    chosenUsers,
    hasChosen,
    triggerLabel,
    namesLabel,
    handlePersonToggle,
  } = usePeoplePicker({ projectId, value, onChange });
  const triggerClassName = cn(
    '-mr-2 flex h-9 min-w-0 items-center gap-2 rounded-lg px-2 text-left transition-colors hover:bg-groove/60 disabled:opacity-100 disabled:hover:bg-transparent',
    { 'text-dim': !hasChosen }
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

/** Человек в списке выбора: аватар, имя и галочка, если выбран */
function PersonOption({
  user,
  chosenIds,
  onToggle,
}: PersonOptionProps): ReactNode {
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
