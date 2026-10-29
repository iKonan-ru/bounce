import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { MarkupToolbar, useMarkupEditing } from '@/components/markup-toolbar';
import { useMentions } from '@/components/mentions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SAVE_FAILED } from '@/lib/errors';
import type { Note } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { useProjectPeople } from '@/lib/people';
import { queryKeys } from '@/lib/query-keys';

// Правка текста своей заметки: поле, разметка и упоминания живут, только пока форма открыта.
export function NoteEditForm({ note, onDone }: { note: Note; onDone: () => void }) {
  const client = useQueryClient();
  const [draft, setDraft] = useState(note.text);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const editMarkup = useMarkupEditing(editRef, draft, setDraft);
  const editMentions = useMentions({
    ref: editRef,
    value: draft,
    setValue: setDraft,
    people: useProjectPeople(note.project, 'active'),
  });
  const saveText = useMutation({
    mutationFn: () => collection(pb, 'notes').update(note.id, { text: draft.trim() }),
    onSuccess: async () => {
      onDone();
      await client.invalidateQueries({ queryKey: queryKeys.notes.all });
    },
    onError: () => toast.error(SAVE_FAILED),
  });
  const busy = saveText.isPending;
  // пустой текст - только если в заметке есть файлы: иначе от неё ничего не останется
  const empty =
    draft.trim() === '' && (note.images ?? []).length === 0 && (note.audio ?? []).length === 0;

  return (
    <form
      className="mt-2 flex flex-col gap-2 pl-[2.375rem]"
      onSubmit={(e) => {
        e.preventDefault();
        if (empty) return;
        if (draft.trim() !== note.text) saveText.mutate();
        else onDone();
      }}
    >
      <label htmlFor={`edit-${note.id}`} className="sr-only">
        Текст заметки
      </label>
      <MarkupToolbar onAction={editMarkup.onAction} disabled={busy} className="-ml-1.5" />
      <Textarea
        ref={editRef}
        id={`edit-${note.id}`}
        rows={3}
        maxLength={10000}
        value={draft}
        disabled={busy}
        onChange={(e) => setDraft(e.target.value)}
        onSelect={editMentions.sync}
        onKeyDown={(e) => {
          if (editMentions.onKeyDown(e)) return;
          editMarkup.onKeyDown(e);
        }}
        onPaste={(e) => {
          editMarkup.onPaste(e);
        }}
      />
      {editMentions.menu}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" disabled={busy} onClick={onDone}>
          Отмена
        </Button>
        <Button type="submit" disabled={busy || empty}>
          Сохранить
        </Button>
      </div>
    </form>
  );
}
