import type { ReactNode } from 'react';
import { getMentionOptionId } from '@/shared/utils';
import type { MentionMenuProps } from '../types/mention-menu';
import { MentionOption } from './mention-option';

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
