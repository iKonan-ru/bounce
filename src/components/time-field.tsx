import { Clock, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Время "чч:мм" - системный выбор времени (на телефоне - колёсики iOS и Android). Пусто - без
// времени. Пока время крутят колёсиками или набирают, оно только в поле; сохраняется, когда
// выбор закрыт ("Готово" на телефоне), из поля ушли или нажали Enter.
const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export function TimeField({
  id,
  value,
  onChange,
  disabled,
  label = 'Время',
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  // окно закрыли, не уходя из поля (Escape): выбранное всё равно сохраняется
  const pending = useRef<{ draft: string; value: string; onChange: (v: string) => void }>(null);
  pending.current = focused ? { draft, value, onChange } : null;
  useEffect(
    () => () => {
      const p = pending.current;
      const next = p?.draft.slice(0, 5) ?? '';
      if (p && next !== p.value && (next === '' || TIME.test(next))) p.onChange(next);
    },
    [],
  );

  function commit(v: string) {
    // секунды, если браузер их добавил, не нужны
    const next = v.slice(0, 5);
    if (next !== '' && !TIME.test(next)) {
      setDraft(value);
      return;
    }
    if (next !== value) onChange(next);
  }

  return (
    <div className="flex items-center gap-1">
      <label
        className={cn(
          'relative -mr-2 flex h-9 items-center gap-2 rounded-lg px-2 transition-colors',
          !disabled && 'cursor-pointer hover:bg-groove/60',
          !value && 'text-dim',
        )}
      >
        <Clock className="size-4" />
        <span className="sr-only">{label}</span>
        <input
          id={id}
          type="time"
          step={300}
          disabled={disabled}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            commit(e.target.value);
          }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className={cn(
            'w-[4.75rem] bg-transparent tabular-nums outline-none [&::-webkit-calendar-picker-indicator]:hidden',
            !draft && 'text-dim',
            !disabled && 'cursor-pointer',
          )}
        />
      </label>
      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Убрать время"
          className="-mr-2 text-dim"
          onClick={() => {
            setDraft('');
            onChange('');
          }}
        >
          <X />
        </Button>
      )}
    </div>
  );
}
