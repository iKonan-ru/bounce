import type { FormEvent, ChangeEvent, KeyboardEvent } from 'react';
import { useState, useRef } from 'react';
import { useProjectPeople, PeopleKind } from '@/entities/project';
import { CLOSE_KEY } from '../constants/add-inline';
import type { AddRowProps, UseAddRowResult } from '../types/add-inline';
import { useMentions } from './use-mentions';

/** Логика строки "+ Добавить ...": раскрытие, поле с упоминаниями и добавление */
export function useAddRow({
  onAdd,
  isBusy,
  mentionProjectId,
}: Pick<
  AddRowProps,
  'onAdd' | 'isBusy' | 'mentionProjectId'
>): UseAddRowResult {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const people = useProjectPeople(mentionProjectId, PeopleKind.Active);
  const mentions = useMentions({
    ref: inputRef,
    value: title,
    setValue: setTitle,
    people,
  });
  const hasTitle = title.trim() !== '';
  const isAddDisabled = !hasTitle || isBusy === true;

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const canAdd = trimmedTitle !== '' && !isBusy;

    if (!canAdd) {
      return;
    }

    try {
      await onAdd(trimmedTitle);
      setTitle('');
    } catch (error) {
      // сообщение об ошибке показывает вызывающий; текст остаётся в поле
      console.error(error);
    }
  };
  const onFormSubmit = (event: FormEvent<HTMLFormElement>): void => {
    void handleSubmit(event);
  };
  const onOpenClick = (): void => {
    setIsOpen(true);
  };
  const onTitleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setTitle(event.target.value);
  };
  const onTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (mentions.onKeyDown(event)) {
      return;
    }

    if (event.key === CLOSE_KEY) {
      setTitle('');
      setIsOpen(false);
    }
  };
  const onTitleBlur = (): void => {
    if (!hasTitle) {
      setIsOpen(false);
    }
  };

  return {
    isOpen,
    title,
    inputRef,
    isAddDisabled,
    mentionsMenu: mentions.menu,
    onOpenClick,
    onFormSubmit,
    onTitleChange,
    onTitleSelect: mentions.sync,
    onTitleKeyDown,
    onTitleBlur,
  };
}
