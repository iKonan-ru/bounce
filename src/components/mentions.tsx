import type { CSSProperties, ReactNode, MouseEvent } from 'react';
import type { Person } from '@/shared/types';
import { Avatar } from '@/shared/ui';
import { cn, getMentionOptionId } from '@/shared/utils';

/** Пропсы строки списка упоминаний */
interface MentionOptionProps {
  person: Person;
  index: number;
  optionId: string;
  isActive: boolean;
  onActivate: (index: number) => void;
  onPick: (person: Person) => void;
}

/** Пропсы списка упоминаний */
interface MentionMenuProps {
  /** id списка: из него и номера строки складываются id строк */
  listId: string;
  style: CSSProperties | undefined;
  people: readonly Person[];
  /** Номер выбранной строки */
  activeIndex: number;
  onActivate: (index: number) => void;
  onPick: (person: Person) => void;
}

/** Строка списка упоминаний: аватар, имя и логин */
function MentionOption({
  person,
  index,
  optionId,
  isActive,
  onActivate,
  onPick,
}: MentionOptionProps): ReactNode {
  // нажатие не уводит фокус из поля
  const onOptionMouseDown = (event: MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
  };
  const onOptionMouseEnter = (): void => {
    onActivate(index);
  };
  const onOptionClick = (): void => {
    onPick(person);
  };
  const optionClassName = cn(
    'flex min-h-10 w-full items-center gap-2.5 rounded-md px-2 text-left md:min-h-9',
    { 'bg-groove/70': isActive }
  );

  return (
    <button
      type="button"
      id={optionId}
      role="option"
      aria-selected={isActive}
      tabIndex={-1}
      onMouseDown={onOptionMouseDown}
      onMouseEnter={onOptionMouseEnter}
      onClick={onOptionClick}
      className={optionClassName}
    >
      <Avatar user={person} className="size-6 text-[0.625rem]" />
      <span className="min-w-0 flex-1 truncate">{person.name}</span>
      <span className="shrink-0 text-xs text-dim">@{person.username}</span>
    </button>
  );
}

/** Список подходящих людей под полем с упоминаниями (hooks/use-mentions.tsx) */
export function MentionMenu({
  listId,
  style,
  people,
  activeIndex,
  onActivate,
  onPick,
}: MentionMenuProps): ReactNode {
  return (
    <div
      id={listId}
      role="listbox"
      aria-label="Упомянуть"
      style={style}
      className="z-[70] w-64 max-w-[calc(100vw-2rem)] animate-in fade-in-0 zoom-in-95 rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100"
    >
      {people.map((person, index) => {
        const optionId = getMentionOptionId(listId, index);
        const isActive = index === activeIndex;

        return (
          <MentionOption
            key={person.id}
            person={person}
            index={index}
            optionId={optionId}
            isActive={isActive}
            onActivate={onActivate}
            onPick={onPick}
          />
        );
      })}
    </div>
  );
}
