import type {
  FormEvent,
  ChangeEvent,
  KeyboardEvent,
  ClipboardEvent,
} from 'react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useProjectPeople, PeopleKind } from '@/entities/project';
import { useMarkupEditing } from '@/features/markup';
import { useMentions } from '@/features/mentions';
import { getCollection, pb, Collections, queryKeys } from '@/shared/api';
import { SAVE_FAILED } from '@/shared/constants';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import type {
  NoteEditFormProps,
  UseNoteEditFormResult,
} from '../types/note-edit-form';

/** Логика правки текста заметки: черновик, разметка, упоминания и сохранение */
export function useNoteEditForm({
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
