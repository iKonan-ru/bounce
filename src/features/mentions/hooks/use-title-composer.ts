import type { ChangeEvent, KeyboardEvent } from 'react';
import { useRef } from 'react';
import { useProjectPeople, PeopleKind } from '@/entities/project';
import type {
  TitleComposerProps,
  UseTitleComposerResult,
} from '../types/title-composer';
import { useMentions } from './use-mentions';

/** Логика строки добавления: поле и упоминания людей проекта */
export function useTitleComposer({
  value,
  onChange,
  projectId,
  inputRef,
}: Pick<
  TitleComposerProps,
  'value' | 'onChange' | 'projectId' | 'inputRef'
>): UseTitleComposerResult {
  const ownInputRef = useRef<HTMLInputElement>(null);
  const fieldRef = inputRef ?? ownInputRef;
  const people = useProjectPeople(projectId, PeopleKind.Active);
  const mentions = useMentions({
    ref: fieldRef,
    value,
    setValue: onChange,
    people,
  });
  const onValueChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange(event.target.value);
  };
  const onValueKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    mentions.onKeyDown(event);
  };

  return {
    fieldRef,
    hasValue: value.trim() !== '',
    mentionsMenu: mentions.menu,
    onValueChange,
    onValueSelect: mentions.sync,
    onValueKeyDown,
  };
}
