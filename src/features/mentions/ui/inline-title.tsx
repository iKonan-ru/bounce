import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { MentionText } from '@/entities/user';
import { cn } from '@/shared/utils';
import { DEFAULT_MAX_LENGTH } from '../constants/inline-title';
import { useInlineTitle } from '../hooks/use-inline-title';
import type { InlineTitleProps } from '../types/inline-title';

/**
 * Текст, который правится на месте: нажатие на текст или карандаш - поле, Enter или уход из
 * поля - сохранить, Escape - отменить (как названия задач в Linear и Things)
 */
export function InlineTitle({
  value,
  onSave,
  label,
  maxLength = DEFAULT_MAX_LENGTH,
  showPencil = true,
  mentionProjectId,
  className,
}: InlineTitleProps): ReactNode {
  const {
    isEditing,
    draft,
    inputRef,
    mentionsMenu,
    onEditClick,
    onSubmit,
    onInputFocus,
    onInputChange,
    onInputSelect,
    onInputBlur,
    onInputKeyDown,
  } = useInlineTitle({ value, onSave, mentionProjectId });
  const textClassName = cn('inline', className);
  const formClassName = cn('animate-in fade-in-0 duration-150', className);

  if (!isEditing) {
    return (
      <span className={textClassName}>
        <button
          type="button"
          title={label}
          onClick={onEditClick}
          className="-mx-1.5 max-w-full cursor-text rounded-lg px-1.5 text-left text-pretty [text-decoration:inherit] transition-colors hover:bg-groove/60"
        >
          <MentionText text={value} />
        </button>
        {showPencil && (
          <button
            type="button"
            aria-label={label}
            onClick={onEditClick}
            className="ml-1 inline-flex size-8 -translate-y-0.5 items-center justify-center rounded-lg align-middle text-dim transition-colors hover:bg-groove hover:text-ink"
          >
            <Pencil className="size-4" />
          </button>
        )}
      </span>
    );
  }

  return (
    <form onSubmit={onSubmit} className={formClassName}>
      <input
        ref={inputRef}
        aria-label={label}
        // autoFocus: поле появляется по нажатию на текст
        autoFocus
        maxLength={maxLength}
        value={draft}
        onFocus={onInputFocus}
        onChange={onInputChange}
        onSelect={onInputSelect}
        onBlur={onInputBlur}
        onKeyDown={onInputKeyDown}
        className="-mx-1.5 w-[calc(100%+0.75rem)] rounded-lg bg-groove/60 px-1.5 font-[inherit] text-[length:inherit] tracking-[inherit] outline-none ring-2 ring-ring/40"
      />
      {mentionsMenu}
    </form>
  );
}
