import { cn } from '@/lib/utils';

type Option<T extends string> = { value: T; label: string };

// Переключатель из нескольких вариантов (вкладки на телефоне, статус песни).
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: ReadonlyArray<Option<T>>;
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <fieldset className={cn('flex min-w-0 gap-1 rounded-xl bg-panel p-1', className)}>
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-9 min-w-0 flex-1 truncate rounded-lg px-3 text-sm transition-colors',
            value === o.value ? 'bg-groove font-medium text-ink' : 'text-dim hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  );
}
