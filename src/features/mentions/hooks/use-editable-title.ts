import type { ChangeEvent, KeyboardEvent } from 'react';
import { useRef, useState } from 'react';
import { useProjectPeople, PeopleKind } from '@/entities/project';
import { useDraft } from '@/shared/hooks';
import { ENTER_KEY } from '../constants/editable-title';
import type {
  EditableTitleProps,
  UseEditableTitleResult,
} from '../types/editable-title';
import { useMentions } from './use-mentions';

/** Название в шапке окна: черновик, упоминания и сохранение при уходе из поля */
export function useEditableTitle({
  value,
  projectId,
  onCommit,
}: Pick<
  EditableTitleProps,
  'value' | 'projectId' | 'onCommit'
>): UseEditableTitleResult {
  const { draft: title, setDraft: setTitle, start, finish } = useDraft(value);
  const people = useProjectPeople(projectId, PeopleKind.Active);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const mentions = useMentions({
    ref: titleRef,
    value: title,
    setValue: setTitle,
    people,
  });

  const onTitleBlur = (): void => {
    setIsEditing(false);
    const isChanged = finish();
    const trimmedTitle = title.trim();
    const shouldRestore = [
      !isChanged,
      !trimmedTitle,
      trimmedTitle === value,
    ].some(Boolean);

    if (shouldRestore) {
      setTitle(value);

      return;
    }

    onCommit(trimmedTitle);
  };

  const focusTitle = (): void => {
    if (titleRef.current) {
      titleRef.current.focus();
    }
  };

  const onTitleClick = (): void => {
    setIsEditing(true);
    requestAnimationFrame(focusTitle);
  };

  const onTitleChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setTitle(event.target.value);
  };

  const onTitleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (mentions.onKeyDown(event)) {
      return;
    }

    if (event.key === ENTER_KEY) {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  return {
    title,
    isEditing,
    titleRef,
    mentionsMenu: mentions.menu,
    onTitleClick,
    onTitleChange,
    onTitleSelect: mentions.sync,
    onTitleFocus: start,
    onTitleBlur,
    onTitleKeyDown,
  };
}
