import { Check, Pencil, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Заголовок, который правится на месте: карандаш - поле - галочка.
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

  function submit(e: FormEvent) {
    e.preventDefault();
    const t = draft.trim();
    if (t && t !== value) onSave(t);
    setEditing(false);
  }

  if (!editing) {
    return (
      <span className="inline-flex items-start gap-1">
        <span>{value}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          className="mt-0.5 text-dim"
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          <Pencil />
        </Button>
      </span>
    );
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-1">
      <Input
        aria-label={label}
        autoFocus
        maxLength={maxLength}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
        className="h-11 text-lg font-semibold"
      />
      <Button type="submit" variant="ghost" size="icon" aria-label="Сохранить">
        <Check />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Отмена"
        onClick={() => setEditing(false)}
      >
        <X />
      </Button>
    </form>
  );
}
