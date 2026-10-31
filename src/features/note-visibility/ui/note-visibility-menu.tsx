import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { NoteVisibility } from '@/entities/note';
import {
  Avatar,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
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
        value={props.value.visibility}
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
      </DropdownMenuRadioGroup>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger disabled={props.isBusy}>
          Выбранные участники
          {props.value.visibility === NoteVisibility.selected && (
            <Check className="size-4" />
          )}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="max-h-80 max-w-[calc(100vw-2rem)] overflow-y-auto">
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
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={isSaveDisabled} onSelect={onSave}>
            Готово
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}
