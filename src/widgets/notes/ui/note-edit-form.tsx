import type { ReactNode } from 'react';
import { MarkupToolbar } from '@/features/markup';
import { Textarea, Button } from '@/shared/ui';
import { NOTE_TEXT_MAX_LENGTH } from '../constants/note-edit-form';
import { useNoteEditForm } from '../hooks/use-note-edit-form';
import type { NoteEditFormProps } from '../types/note-edit-form';

/** Правка текста своей заметки: поле, разметка и упоминания живут, только пока форма открыта */
export function NoteEditForm({ note, onDone }: NoteEditFormProps): ReactNode {
  const {
    editRef,
    draft,
    textareaId,
    isBusy,
    isSaveDisabled,
    mentionsMenu,
    onMarkupAction,
    onDraftSelect,
    onDraftChange,
    onDraftKeyDown,
    onDraftPaste,
    onSubmit,
  } = useNoteEditForm({ note, onDone });

  return (
    <form
      className="mt-2 flex flex-col gap-2 pl-[2.375rem]"
      onSubmit={onSubmit}
    >
      <label htmlFor={textareaId} className="sr-only">
        Текст заметки
      </label>
      <MarkupToolbar
        onAction={onMarkupAction}
        disabled={isBusy}
        className="-ml-1.5"
      />
      <Textarea
        ref={editRef}
        id={textareaId}
        rows={3}
        maxLength={NOTE_TEXT_MAX_LENGTH}
        value={draft}
        disabled={isBusy}
        onChange={onDraftChange}
        onSelect={onDraftSelect}
        onKeyDown={onDraftKeyDown}
        onPaste={onDraftPaste}
      />
      {mentionsMenu}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={isBusy}
          onClick={onDone}
        >
          Отмена
        </Button>
        <Button type="submit" disabled={isSaveDisabled}>
          Сохранить
        </Button>
      </div>
    </form>
  );
}
