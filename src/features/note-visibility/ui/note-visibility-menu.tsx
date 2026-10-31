import type { ReactNode } from 'react';
import { NoteVisibility } from '@/entities/note';
import {
  Avatar,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  Collapse,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/shared/ui';
import { useNoteVisibility } from '../hooks/use-note-visibility';
import type { NoteVisibilityMenuProps } from '../types/visibility';

/** Тип доступа выбирается сразу; адресный доступ применяется после выбора людей. */
export function NoteVisibilityMenu(props: NoteVisibilityMenuProps): ReactNode {
  const {
    visibility,
    isSelected,
    people,
    recipients,
    isSaveDisabled,
    onVisibilityChange,
    onToggle,
    onSave,
  } = useNoteVisibility(props);

  return (
    <>
      <DropdownMenuRadioGroup
        value={visibility}
        onValueChange={onVisibilityChange}
      >
        <DropdownMenuRadioItem
          value={NoteVisibility.project}
          disabled={props.isBusy}
        >
          Все участники проекта
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem
          value={NoteVisibility.private}
          disabled={props.isBusy}
        >
          Только я
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem
          value={NoteVisibility.selected}
          disabled={props.isBusy}
          onSelect={(event) => event.preventDefault()}
        >
          Выбранные участники
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <Collapse isOpen={isSelected}>
        <DropdownMenuSeparator />
        <div className="max-h-64 overflow-y-auto">
          {people.map((user) => (
            <DropdownMenuCheckboxItem
              key={user.id}
              checked={recipients.includes(user.id)}
              disabled={props.isBusy}
              onCheckedChange={() => onToggle(user.id)}
              onSelect={(event) => event.preventDefault()}
            >
              <Avatar user={user} className="size-7 shrink-0" />
              <span className="min-w-0 break-words">{user.name}</span>
            </DropdownMenuCheckboxItem>
          ))}
          {people.length === 0 && (
            <DropdownMenuLabel>Других участников нет</DropdownMenuLabel>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isSaveDisabled} onSelect={onSave}>
          Готово
        </DropdownMenuItem>
      </Collapse>
    </>
  );
}
