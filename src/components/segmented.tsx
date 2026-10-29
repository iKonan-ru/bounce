import { cn } from '@/lib/utils';

type Option<T extends string> = { value: T; label: string };

// Переключатель из нескольких вариантов (вкладки на телефоне, статус песни).
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled,
  className,
}: {
  options: ReadonlyArray<Option<T>>;
  value: T;
  onChange: (v: T) => void;
  label: string;
  // только смотреть (наблюдатель): выбранный вариант виден, переключить нельзя
  disabled?: boolean;
  className?: string;
}) {
  return (
    <fieldset
      disabled={disabled}
      className={cn('flex min-w-0 gap-1 rounded-xl bg-panel p-1', className)}
    >
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-9 min-w-0 flex-auto truncate rounded-lg px-2.5 text-sm whitespace-nowrap transition-colors',
            value === o.value
              ? 'bg-groove font-medium text-ink'
              : 'text-dim hover:text-ink disabled:hover:text-dim',
          )}
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  );
}
