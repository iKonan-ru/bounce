import { useState } from 'react';
import { NoteVisibility } from '@/entities/note';
import { useProjectPeople } from '@/entities/project';
import type {
  NoteVisibilityMenuProps,
  UseNoteVisibilityResult,
} from '../types/visibility';

/** Выбор применяется целиком, незавершенное выделение никому не открывает заметку */
export function useNoteVisibility(
  props: NoteVisibilityMenuProps
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
  const isEmpty = available.length === 0;
  const isSaveDisabled = Boolean(props.isBusy) || isEmpty;

  const onVisibilityChange = (value: string): void => {
    const nextVisibility = value as NoteVisibility;
    setVisibility(nextVisibility);

    if (nextVisibility !== NoteVisibility.selected) {
      props.onSave({ visibility: nextVisibility, recipients: [] });
    }
  };
  const onToggle = (id: string): void => {
    setRecipients((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  };
  const onSave = (): void => {
    props.onSave({
      visibility: NoteVisibility.selected,
      recipients: available,
    });
  };

  return {
    visibility,
    isSelected: visibility === NoteVisibility.selected,
    people,
    recipients,
    isSaveDisabled,
    onVisibilityChange,
    onToggle,
    onSave,
  };
}
