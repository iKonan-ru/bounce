import { type FormEvent, useState } from 'react';

// Заголовок, который правится на месте: нажатие - поле, Enter или уход из поля - сохранить,
// Escape - отменить (как названия задач в Linear).
export function InlineTitle({
  value,
  onSave,
  label,
  maxLength = 120,
}: {
  value: string;
  onSave: (v: string) => void;
  label: string;
  maxLength?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    const t = draft.trim();
    if (t && t !== value) onSave(t);
    setEditing(false);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    commit();
  }

  if (!editing) {
    return (
      <button
        type="button"
        title={label}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className="-mx-1.5 max-w-full rounded-lg px-1.5 text-left transition-colors hover:bg-groove/60"
      >
        {value}
      </button>
    );
  }
  return (
    <form onSubmit={submit}>
      <input
        aria-label={label}
        // biome-ignore lint/a11y/noAutofocus: поле появляется по нажатию на заголовок
        autoFocus
        maxLength={maxLength}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false);
        }}
        className="-mx-1.5 w-full rounded-lg bg-groove/60 px-1.5 outline-none ring-2 ring-ring/40"
      />
    </form>
  );
}
