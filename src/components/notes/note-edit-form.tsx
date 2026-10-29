import type {
  RefObject,
  ReactNode,
  ComponentProps,
  ChangeEvent,
  KeyboardEvent,
  ClipboardEvent,
  FormEvent,
} from 'react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { MarkupToolbar } from '@/components/markup-toolbar';
import { useMarkupEditing } from '@/hooks/use-markup-editing';
import { useMentions } from '@/hooks/use-mentions';
import type { Note } from '@/lib/model';
import { useProjectPeople, PeopleKind } from '@/lib/people';
import { getCollection, pb, Collections, queryKeys } from '@/shared/api';
import { SAVE_FAILED } from '@/shared/constants';
import { Textarea, Button } from '@/shared/ui';
import { useQueryClient, useMutation } from '@tanstack/react-query';

/** Самый длинный текст заметки */
const NOTE_TEXT_MAX_LENGTH = 10000;

/** Пропсы формы правки заметки */
interface NoteEditFormProps {
  note: Note;
  /** Правка закончена: сохранили, отменили или текст не поменялся */
  onDone: () => void;
}

/** Состояние и обработчики формы правки заметки */
interface UseNoteEditFormResult {
  editRef: RefObject<HTMLTextAreaElement | null>;
  draft: string;
  textareaId: string;
  isBusy: boolean;
  isSaveDisabled: boolean;
  /** Список упоминаний под полем */
  mentionsMenu: ReactNode;
  onMarkupAction: ComponentProps<typeof MarkupToolbar>['onAction'];
  onDraftSelect: () => void;
  onDraftChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onDraftKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onDraftPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/** Логика правки текста заметки: черновик, разметка, упоминания и сохранение */
function useNoteEditForm({
  note,
  onDone,
}: NoteEditFormProps): UseNoteEditFormResult {
  const client = useQueryClient();
  const [draft, setDraft] = useState(note.text);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const editMarkup = useMarkupEditing(editRef, draft, setDraft);
  const people = useProjectPeople(note.project, PeopleKind.Active);
  const editMentions = useMentions({
    ref: editRef,
    value: draft,
    setValue: setDraft,
    people,
  });
  const saveText = useMutation({
    mutationFn: () =>
      getCollection(pb, Collections.Notes).update(note.id, {
        text: draft.trim(),
      }),
    onSuccess: async () => {
      onDone();
      await client.invalidateQueries({ queryKey: queryKeys.notes.all });
    },
    onError: () => {
      toast.error(SAVE_FAILED);
    },
  });
  const isBusy = saveText.isPending;
  const isTextEmpty = draft.trim() === '';
  const hasImages = (note.images ?? []).length > 0;
  const hasAudio = (note.audio ?? []).length > 0;
  // пустой текст - только если в заметке есть файлы: иначе от неё ничего не останется
  const isEmpty = [isTextEmpty, !hasImages, !hasAudio].every(Boolean);
  const isSaveDisabled = isBusy || isEmpty;
  const textareaId = `edit-${note.id}`;

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (isEmpty) {
      return;
    }

    if (draft.trim() === note.text) {
      onDone();

      return;
    }

    saveText.mutate();
  };
  const onDraftChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setDraft(event.target.value);
  };
  const onDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (editMentions.onKeyDown(event)) {
      return;
    }

    editMarkup.onKeyDown(event);
  };
  const onDraftPaste = (event: ClipboardEvent<HTMLTextAreaElement>): void => {
    editMarkup.onPaste(event);
  };

  return {
    editRef,
    draft,
    textareaId,
    isBusy,
    isSaveDisabled,
    mentionsMenu: editMentions.menu,
    onMarkupAction: editMarkup.onAction,
    onDraftSelect: editMentions.sync,
    onDraftChange,
    onDraftKeyDown,
    onDraftPaste,
    onSubmit,
  };
}

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
