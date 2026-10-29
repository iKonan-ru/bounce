import { Plus } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { LYRICS_TAGS } from '@/entities/song';
import { Textarea, Button } from '@/shared/ui';
import {
  LYRICS_TEXTAREA_ID,
  EDITOR_ROWS,
  LYRICS_MAX_LENGTH,
} from '../constants/lyrics';
import type { TagButtonProps, LyricsFormProps } from '../types/lyrics';

/** Нажатие на метку не забирает фокус у поля: курсор остаётся на месте */
function preventFocusLoss(event: MouseEvent<HTMLButtonElement>): void {
  event.preventDefault();
}

/** Кнопка метки части песни: вставляет её на место курсора */
function TagButton({ tag, isDisabled, onTagAdd }: TagButtonProps): ReactNode {
  const onTagClick = (): void => {
    onTagAdd(tag);
  };

  return (
    <button
      type="button"
      disabled={isDisabled}
      // нажатие не забирает фокус у поля: курсор остаётся на месте
      onMouseDown={preventFocusLoss}
      onClick={onTagClick}
      className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-panel px-3 text-sm ring-1 ring-border/70 transition-colors hover:bg-groove active:bg-groove md:h-8 dark:ring-border/40"
    >
      <Plus className="size-3.5 text-dim" />
      {tag}
    </button>
  );
}

/** Форма правки текста: метки частей, поле и кнопки */
export function LyricsForm({
  draft,
  isSaving,
  isOutdated,
  textareaRef,
  onFormSubmit,
  onDraftChange,
  onTagAdd,
  onCancelClick,
}: LyricsFormProps): ReactNode {
  return (
    <form className="flex max-w-3xl flex-col gap-3" onSubmit={onFormSubmit}>
      <div
        role="toolbar"
        aria-label="Части песни"
        className="sticky top-0 z-10 -mx-4 flex gap-1.5 overflow-x-auto bg-console/95 px-4 py-2 backdrop-blur sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none]"
      >
        {LYRICS_TAGS.map((tag) => (
          <TagButton
            key={tag}
            tag={tag}
            isDisabled={isSaving}
            onTagAdd={onTagAdd}
          />
        ))}
      </div>
      {isOutdated && (
        <p className="text-sm text-led-amber">
          Пока шла эта правка, текст песни изменили. Сохранение заменит новую
          версию.
        </p>
      )}
      <label htmlFor={LYRICS_TEXTAREA_ID} className="sr-only">
        Текст песни
      </label>
      <Textarea
        ref={textareaRef}
        id={LYRICS_TEXTAREA_ID}
        autoFocus
        rows={EDITOR_ROWS}
        maxLength={LYRICS_MAX_LENGTH}
        placeholder={'[Куплет]\n...\n\n[Припев]\n...'}
        value={draft}
        disabled={isSaving}
        onChange={onDraftChange}
        className="min-h-[55dvh] leading-relaxed"
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={isSaving}
          onClick={onCancelClick}
        >
          Отмена
        </Button>
        <Button type="submit" disabled={isSaving}>
          Сохранить
        </Button>
      </div>
    </form>
  );
}
