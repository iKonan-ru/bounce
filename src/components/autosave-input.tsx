import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Поле без кнопки "Сохранить": значение уходит при уходе из поля или по Enter. Пока поле не в
// фокусе, оно следует за сохранённым значением (правки соавтора приходят сами).
// Отправленное значение ждёт ответа сервера не дольше этого: если правка не дошла или её
// перебили, поле снова показывает то, что на сервере.
const SENT_HOLD_MS = 8000;

export function AutosaveInput({
  id,
  value,
  onSave,
  placeholder,
  maxLength,
  inputMode,
  normalize = (v) => v.trim(),
  filter,
  validate = () => true,
  required,
  disabled,
  className,
}: {
  id?: string;
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  inputMode?: 'numeric' | 'text';
  normalize?: (v: string) => string;
  // что можно набрать: лишние символы отбрасываются сразу при вводе
  filter?: (v: string) => string;
  validate?: (v: string) => boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  // отправленное значение держится в поле, пока сервер не вернёт его (без мигания старым)
  const [sent, setSent] = useState<string | null>(null);
  useEffect(() => {
    if (sent !== null && value === sent) setSent(null);
    if (!focused && sent === null) setDraft(value);
  }, [value, focused, sent]);
  useEffect(() => {
    if (sent === null) return;
    const t = setTimeout(() => setSent(null), SENT_HOLD_MS);
    return () => clearTimeout(t);
  }, [sent]);

  const next = normalize(draft);
  const valid = validate(next) && (!required || next !== '');
  // Escape: поле теряет фокус, и blur сохранил бы набранное - эта отметка его отменяет
  const cancelled = useRef(false);

  function commit() {
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(value);
      return;
    }
    if (!valid) {
      setDraft(value);
      return;
    }
    if (next !== value) {
      setSent(next);
      setDraft(next);
      onSave(next);
    }
  }

  return (
    <Input
      id={id}
      value={draft}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      disabled={disabled}
      aria-invalid={!valid}
      onChange={(e) => setDraft(filter ? filter(e.target.value) : e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          cancelled.current = true;
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
      className={cn(
        'h-10 border-0 bg-transparent px-2 text-right shadow-none hover:bg-groove/40 focus-visible:bg-groove/40 focus-visible:ring-0 dark:bg-transparent md:h-9',
        className,
      )}
    />
  );
}
