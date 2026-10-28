import { Pencil } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { cn } from '@/lib/utils';

// Текст, который правится на месте: нажатие на текст или карандаш - поле, Enter или уход из
// поля - сохранить, Escape - отменить (как названия задач в Linear и Things).
export function InlineTitle({
  value,
  onSave,
  label,
  maxLength = 120,
  pencil = true,
  className,
}: {
  value: string;
  onSave: (v: string) => void;
  label: string;
  maxLength?: number;
  // карандаш рядом с текстом; без него правка - только по нажатию на текст
  pencil?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const start = () => {
    setDraft(value);
    setEditing(true);
  };

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
      <span className={cn('inline', className)}>
        <button
          type="button"
          title={label}
          onClick={start}
          className="-mx-1.5 max-w-full cursor-text rounded-lg px-1.5 text-left text-pretty [text-decoration:inherit] transition-colors hover:bg-groove/60"
        >
          {value}
        </button>
        {pencil && (
          <button
            type="button"
            aria-label={label}
            onClick={start}
            className="ml-1 inline-flex size-8 -translate-y-0.5 items-center justify-center rounded-lg align-middle text-dim transition-colors hover:bg-groove hover:text-ink"
          >
            <Pencil className="size-4" />
          </button>
        )}
      </span>
    );
  }
  return (
    <form onSubmit={submit} className={cn('animate-in fade-in-0 duration-150', className)}>
      <input
        aria-label={label}
        // biome-ignore lint/a11y/noAutofocus: поле появляется по нажатию на текст
        autoFocus
        maxLength={maxLength}
        value={draft}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false);
        }}
        className="-mx-1.5 w-[calc(100%+0.75rem)] rounded-lg bg-groove/60 px-1.5 font-[inherit] text-[length:inherit] tracking-[inherit] outline-none ring-2 ring-ring/40"
      />
    </form>
  );
}
