import { useState } from 'react';
import { NoteVisibility } from '@/entities/note';
import { useProjectPeople } from '@/entities/project';
import type {
  NoteVisibilityDialogProps,
  UseNoteVisibilityResult,
} from '../types/visibility';

/** Выбор применяется целиком, незавершенное выделение никому не открывает заметку */
export function useNoteVisibility(
  props: NoteVisibilityDialogProps
): UseNoteVisibilityResult {
  const [visibility, setVisibility] = useState(props.value.visibility);
  const [recipients, setRecipients] = useState(props.value.recipients);
  const members = useProjectPeople(props.projectId);
  const people = members.filter(
    (user) => user.id !== props.authorId && !user.disabled
  );
  const available = recipients.filter((id) =>
    people.some((user) => user.id === id)
  );
  const isSelected = visibility === NoteVisibility.selected;
  const isEmpty = isSelected && available.length === 0;
  const isSaveDisabled = Boolean(props.isBusy) || isEmpty;

  const onVisibilityChange = (value: string): void => {
    setVisibility(value as NoteVisibility);
  };
  const onToggle = (id: string): void => {
    setRecipients((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  };
  const onSave = (): void => {
    const chosen = isSelected ? available : [];
    props.onSave({ visibility, recipients: chosen });
  };

  return {
    visibility,
    people,
    recipients,
    isSelected,
    isSaveDisabled,
    onVisibilityChange,
    onToggle,
    onSave,
  };
}
