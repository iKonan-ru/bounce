import { useRef, useState } from 'react';
import { MentionText, useMentions } from '@/components/mentions';
import { useDraft } from '@/lib/draft';
import { useProjectPeople } from '@/lib/people';

// Название в шапке окна задачи или публикации: текстом (упоминания - именами), по нажатию -
// поле с упоминаниями людей проекта; Enter или уход из поля - сохранить. Пока поле правят,
// правка соавтора набранное не затирает (lib/draft.ts); если ничего не поменяли или стёрли всё,
// старое не отправляется.
export function EditableTitle({
  id,
  label,
  value,
  projectId,
  disabled,
  onCommit,
}: {
  id: string;
  // подпись поля для экранного диктора
  label: string;
  // название с сервера
  value: string;
  projectId: string;
  disabled: boolean;
  // новое название без пробелов по краям
  onCommit: (title: string) => void;
}) {
  const { draft: title, setDraft: setTitle, start, finish } = useDraft(value);
  const people = useProjectPeople(projectId, 'active');
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [editing, setEditing] = useState(false);
  const mentions = useMentions({ ref: titleRef, value: title, setValue: setTitle, people });
  const commit = () => {
    setEditing(false);
    const changed = finish();
    const t = title.trim();
    if (!changed || !t || t === value) {
      setTitle(value);
      return;
    }
    onCommit(t);
  };

  return (
    <>
      {!editing && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setEditing(true);
            requestAnimationFrame(() => titleRef.current?.focus());
          }}
          className="min-w-0 flex-1 cursor-text rounded-lg px-1.5 text-left text-lg leading-8 font-medium text-pretty transition-colors hover:bg-groove/40 disabled:cursor-default disabled:hover:bg-transparent"
        >
          <MentionText text={value} />
        </button>
      )}
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        ref={titleRef}
        id={id}
        rows={1}
        maxLength={300}
        hidden={!editing}
        disabled={disabled}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onSelect={mentions.sync}
        onFocus={start}
        onBlur={commit}
        onKeyDown={(e) => {
          if (mentions.onKeyDown(e)) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className="field-sizing-content min-w-0 flex-1 resize-none rounded-lg bg-transparent px-1.5 py-0 text-left text-lg leading-8 font-medium outline-none transition-colors hover:bg-groove/40 focus:bg-groove/50 disabled:opacity-100 disabled:hover:bg-transparent"
      />
      {mentions.menu}
    </>
  );
}
