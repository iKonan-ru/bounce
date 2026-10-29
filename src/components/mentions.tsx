import type { CSSProperties, ReactNode, MouseEvent } from 'react';
import { usersQuery } from '@/lib/queries';
import type { Person, MentionPart } from '@/shared/types';
import { MentionPartKind } from '@/shared/types';
import { Avatar } from '@/shared/ui';
import { cn, getMentionOptionId, splitMentions } from '@/shared/utils';
import { useQuery } from '@tanstack/react-query';

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

/** Пропсы имени вместо логина */
interface MentionNameProps {
  username: string;
}

/** Пропсы текста с упоминаниями */
interface MentionTextProps {
  text: string;
}

/** Пропсы части текста с упоминаниями */
interface MentionPartViewProps {
  part: MentionPart;
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

/** Имя вместо @логина; кого нет среди пользователей - логин как есть */
export function MentionName({ username }: MentionNameProps): ReactNode {
  const users = useQuery(usersQuery);
  const user = users.data?.find((candidate) => candidate.username === username);
  const mentionLabel = `@${username}`;
  const hasUser = Boolean(user);
  const nameClassName = cn(
    'rounded-md px-1 py-px font-medium whitespace-nowrap',
    {
      'bg-groove/80 text-ink': hasUser,
      'text-dim': !hasUser,
    }
  );
  const displayName = user ? user.name : mentionLabel;

  return (
    <span title={mentionLabel} className={nameClassName}>
      {displayName}
    </span>
  );
}

/** Часть текста: упоминание показывается именем, остальное - как есть */
function MentionPartView({ part }: MentionPartViewProps): ReactNode {
  if (part.kind === MentionPartKind.Mention) {
    return <MentionName username={part.username} />;
  }

  return <span>{part.text}</span>;
}

/** Обычный текст с упоминаниями: логины показываются именами */
export function MentionText({ text }: MentionTextProps): ReactNode {
  const parts = splitMentions(text);

  return (
    <>
      {parts.map((part, index) => (
        // ключ - позиция: части идут по порядку текста
        <MentionPartView key={index} part={part} />
      ))}
    </>
  );
}
