import type { ReactNode } from 'react';
import { NoteVisibility } from '@/entities/note';
import {
  Avatar,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  MenuSelect,
} from '@/shared/ui';
import { useNoteVisibility } from '../hooks/use-note-visibility';
import type {
  NoteVisibilityDialogProps,
  RecipientProps,
} from '../types/visibility';

/** Кто видит заметку: один выбор, люди появляются только для адресного доступа */
export function NoteVisibilityDialog(
  props: NoteVisibilityDialogProps
): ReactNode {
  const {
    visibility,
    people,
    recipients,
    isSelected,
    isSaveDisabled,
    onVisibilityChange,
    onToggle,
    onSave,
  } = useNoteVisibility(props);

  return (
    <Dialog open onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Кто видит заметку</DialogTitle>
        </DialogHeader>
        <MenuSelect
          value={visibility}
          onChange={onVisibilityChange}
          disabled={Boolean(props.isBusy)}
          label="Кто видит заметку"
          className="mr-0 max-w-none justify-between"
          options={[
            { value: NoteVisibility.project, label: 'Все участники проекта' },
            { value: NoteVisibility.private, label: 'Только я' },
            { value: NoteVisibility.selected, label: 'Выбранные участники' },
          ]}
        />
        {isSelected && (
          <div className="max-h-64 overflow-y-auto rounded-lg bg-console p-1">
            {people.map((user) => (
              <Recipient
                key={user.id}
                isBusy={props.isBusy}
                user={user}
                recipients={recipients}
                onToggle={onToggle}
              />
            ))}
            {people.length === 0 && (
              <p className="p-3 text-sm text-dim">Других участников нет</p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={props.onClose}
            disabled={Boolean(props.isBusy)}
          >
            Отмена
          </Button>
          <Button type="button" onClick={onSave} disabled={isSaveDisabled}>
            Готово
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Получатель: вся строка нажимается, имя не теряется на узком экране */
function Recipient({
  user,
  recipients,
  onToggle,
  isBusy,
}: RecipientProps): ReactNode {
  const checked = recipients.includes(user.id);
  const onChange = (): void => onToggle(user.id);

  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-groove/60">
      <Checkbox
        disabled={isBusy}
        checked={checked}
        onCheckedChange={onChange}
      />
      <Avatar user={user} className="size-7" />
      <span className="min-w-0 break-words text-sm">{user.name}</span>
    </label>
  );
}
