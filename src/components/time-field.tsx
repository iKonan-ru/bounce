import { Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Время "чч:мм" - системный выбор времени (на телефоне - колёсики iOS и Android). Пусто - без
// времени.
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-[4.75rem] bg-transparent tabular-nums outline-none [&::-webkit-calendar-picker-indicator]:hidden',
            !value && 'text-dim',
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
          onClick={() => onChange('')}
        >
          <X />
        </Button>
      )}
    </div>
  );
}
