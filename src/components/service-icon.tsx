import type { Service } from '@/lib/services';
import { cn } from '@/lib/utils';

// Значок сервиса: знак из Simple Icons (цвета текста или, с colored, цвета сервиса) или
// нейтральная плашка с буквой.
export function ServiceIcon({
  service,
  className,
  colored,
}: {
  service: Service;
  className?: string;
  // в цвете сервиса (для плашки с буквой - всегда)
  colored?: boolean;
}) {
  if (service.icon) {
    return (
      <svg
        role="img"
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={cn('size-5 shrink-0 fill-current', className)}
        style={colored && service.color ? { color: service.color } : undefined}
      >
        <path d={service.icon.path} />
      </svg>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-md bg-groove text-[0.6875rem] leading-none font-semibold text-ink ring-1 ring-border/60',
        className,
      )}
    >
      {service.letter}
    </span>
  );
}
