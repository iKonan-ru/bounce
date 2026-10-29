import type { FormEvent, FocusEvent, ChangeEvent, KeyboardEvent } from 'react';
import { useState, useRef } from 'react';
import { useProjectPeople, PeopleKind } from '@/entities/project';
import { ESCAPE_KEY } from '../constants/inline-title';
import type {
  InlineTitleProps,
  UseInlineTitleResult,
} from '../types/inline-title';
import { useMentions } from './use-mentions';

/** Правка текста на месте: черновик, упоминания, сохранение и отмена */
export function useInlineTitle({
  value,
  onSave,
  mentionProjectId,
}: Pick<
  InlineTitleProps,
  'value' | 'onSave' | 'mentionProjectId'
>): UseInlineTitleResult {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  // Escape: поле исчезает, и браузер шлёт ему blur - без этой отметки blur сохранил бы черновик
  const wasCancelled = useRef(false);
  const people = useProjectPeople(mentionProjectId, PeopleKind.Active);
  const mentions = useMentions({
    ref: inputRef,
    value: draft,
    setValue: setDraft,
    people,
  });

  const onEditClick = (): void => {
    wasCancelled.current = false;
    setDraft(value);
    setIsEditing(true);
  };

  const handleCommit = (): void => {
    if (wasCancelled.current) {
      return;
    }

    const trimmedDraft = draft.trim();
    const isChanged = trimmedDraft !== '' && trimmedDraft !== value;

    if (isChanged) {
      onSave(trimmedDraft);
    }

    setIsEditing(false);
  };

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    handleCommit();
  };

  const onInputFocus = (event: FocusEvent<HTMLInputElement>): void => {
    event.currentTarget.select();
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setDraft(event.target.value);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (mentions.onKeyDown(event)) {
      return;
    }

    if (event.key === ESCAPE_KEY) {
      wasCancelled.current = true;
      setIsEditing(false);
    }
  };

  return {
    isEditing,
    draft,
    inputRef,
    mentionsMenu: mentions.menu,
    onEditClick,
    onSubmit,
    onInputFocus,
    onInputChange,
    onInputSelect: mentions.sync,
    onInputBlur: handleCommit,
    onInputKeyDown,
  };
}
