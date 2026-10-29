import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Input, Button } from '@/shared/ui';
import { TITLE_MAX_LENGTH } from '../constants/title-composer';
import { useTitleComposer } from '../hooks/use-title-composer';
import type { TitleComposerProps } from '../types/title-composer';

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
