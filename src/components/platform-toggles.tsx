import { ServiceIcon } from '@/components/service-icon';
import { POST_PLATFORMS } from '@/lib/services';
import { cn } from '@/lib/utils';

// Кнопки площадок публикации: нажатая - выбрана. Новый список считает
// вызывающий: у публикации - в порядке нажатий, в промо-плане - в порядке площадок.
export function PlatformToggles({
  value,
  onToggle,
}: {
  value: ReadonlyArray<string>;
  onToggle: (id: string, on: boolean) => void;
}) {
  return POST_PLATFORMS.map((s) => {
    const on = value.includes(s.id);
    return (
      <button
        key={s.id}
        type="button"
        aria-pressed={on}
        onClick={() => onToggle(s.id, on)}
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-full px-3 text-sm ring-1 transition-colors',
          on
            ? 'bg-tape text-tape-ink ring-transparent'
            : 'text-dim ring-border/70 hover:text-ink dark:ring-border/40',
        )}
      >
        <ServiceIcon service={s} className="size-4" />
        {s.name}
      </button>
    );
  });
}
