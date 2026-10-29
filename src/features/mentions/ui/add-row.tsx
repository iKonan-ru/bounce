import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Input, Button } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { DEFAULT_TITLE_MAX_LENGTH } from '../constants/add-inline';
import { useAddRow } from '../hooks/use-add-row';
import type { AddRowProps } from '../types/add-inline';

/**
 * Строка "+ Добавить ..." в конце списка: по нажатию превращается в поле (как в Things и Linear)
 *
 * Enter - добавить и продолжить, Escape или пустое поле при уходе - свернуть
 */
export function AddRow({
  id,
  label,
  onAdd,
  isBusy,
  maxLength = DEFAULT_TITLE_MAX_LENGTH,
  mentionProjectId,
  className,
}: AddRowProps): ReactNode {
  const {
    isOpen,
    title,
    inputRef,
    isAddDisabled,
    mentionsMenu,
    onOpenClick,
    onFormSubmit,
    onTitleChange,
    onTitleSelect,
    onTitleKeyDown,
    onTitleBlur,
  } = useAddRow({ onAdd, isBusy, mentionProjectId });

  if (!isOpen) {
    const openButtonClassName = cn(
      'flex min-h-12 w-full items-center gap-3 px-4 text-left text-dim transition-colors hover:bg-groove/40 hover:text-ink md:min-h-10',
      className
    );

    return (
      <button
        type="button"
        onClick={onOpenClick}
        className={openButtonClassName}
      >
        <Plus className="size-4" />
        {label}
      </button>
    );
  }

  const formClassName = cn('flex items-center gap-2 px-2 py-1.5', className);

  return (
    <form onSubmit={onFormSubmit} className={formClassName}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        ref={inputRef}
        id={id}
        autoFocus
        placeholder={label}
        maxLength={maxLength}
        value={title}
        onChange={onTitleChange}
        onSelect={onTitleSelect}
        onKeyDown={onTitleKeyDown}
        onBlur={onTitleBlur}
        className="h-9 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      {mentionsMenu}
      <Button type="submit" size="sm" className="h-8" disabled={isAddDisabled}>
        Добавить
      </Button>
    </form>
  );
}
