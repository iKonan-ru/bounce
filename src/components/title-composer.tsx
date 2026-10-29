import { Plus } from 'lucide-react';
import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useRef,
} from 'react';
import { useMentions } from '@/components/mentions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PeopleKind, useProjectPeople } from '@/lib/people';

/** Самое длинное название */
const TITLE_MAX_LENGTH = 300;

/** Пропсы строки добавления */
interface TitleComposerProps {
  id: string;
  /** Подпись и подсказка в пустом поле */
  label: string;
  value: string;
  onChange: (value: string) => void;
  projectId: string;
  isBusy: boolean;
  /** Поле - тому, кто возвращает в него фокус */
  inputRef?: RefObject<HTMLInputElement | null> | undefined;
}

/** Состояние и обработчики строки добавления */
interface UseTitleComposerResult {
  fieldRef: RefObject<HTMLInputElement | null>;
  /** Есть что добавлять: видна кнопка "Добавить" */
  hasValue: boolean;
  /** Список упоминаний под полем */
  mentionsMenu: ReactNode;
  onValueChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onValueSelect: () => void;
  onValueKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

/** Логика строки добавления: поле и упоминания людей проекта */
function useTitleComposer({
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

/**
 * Строка добавления в плане и контент-плане: поле названия с упоминаниями людей проекта и
 * кнопка "Добавить", пока есть что добавлять
 *
 * Форму (отправку по Enter) даёт вызывающий
 */
export function TitleComposer({
  id,
  label,
  value,
  onChange,
  projectId,
  isBusy,
  inputRef,
}: TitleComposerProps): ReactNode {
  const {
    fieldRef,
    hasValue,
    mentionsMenu,
    onValueChange,
    onValueSelect,
    onValueKeyDown,
  } = useTitleComposer({ value, onChange, projectId, inputRef });

  return (
    <div className="flex items-center gap-2 px-4">
      <Plus className="size-4 shrink-0 text-dim" />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        ref={fieldRef}
        id={id}
        placeholder={label}
        maxLength={TITLE_MAX_LENGTH}
        value={value}
        onChange={onValueChange}
        onSelect={onValueSelect}
        onKeyDown={onValueKeyDown}
        className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 md:h-11 dark:bg-transparent"
      />
      {mentionsMenu}
      {hasValue && (
        <Button
          type="submit"
          size="sm"
          className="h-8 animate-enter"
          disabled={isBusy}
        >
          Добавить
        </Button>
      )}
    </div>
  );
}
