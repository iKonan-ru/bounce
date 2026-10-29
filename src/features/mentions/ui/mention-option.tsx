import type { ReactNode, MouseEvent } from 'react';
import { Avatar } from '@/shared/ui';
import { cn } from '@/shared/utils';
import type { MentionOptionProps } from '../types/mention-menu';

/** Строка списка упоминаний: аватар, имя и логин */
export function MentionOption({
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
