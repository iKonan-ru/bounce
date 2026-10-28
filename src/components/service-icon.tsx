import { Link2 } from 'lucide-react';
import { type CSSProperties, useId } from 'react';
import { OTHER_SERVICE, type Service } from '@/lib/services';
import { cn } from '@/lib/utils';

// Значок сервиса: знак (цвета текста или, с colored, фирменного цвета) или нейтральная плашка
// с буквой. С brandOnHover знак становится фирменным, когда наводят на родителя с классом
// group/brand; у сервисов без своего цвета - просто ярче, как текст рядом.
export function ServiceIcon({
  service,
  className,
  colored,
  brandOnHover,
}: {
  service: Service;
  className?: string;
  colored?: boolean;
  brandOnHover?: boolean;
}) {
  const gradientId = `brand-${useId().replace(/:/g, '')}`;
  if (service.id === OTHER_SERVICE.id) {
    return <Link2 aria-hidden="true" className={cn('size-5 shrink-0', className)} />;
  }
  if (service.icon) {
    const brand = service.gradient ? `url(#${gradientId})` : service.color;
    const style: CSSProperties & { '--brand'?: string } = {};
    if (brand) style['--brand'] = brand;
    return (
      <svg
        role="img"
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={cn(
          'size-5 shrink-0 fill-current',
          colored && brand && '[fill:var(--brand)]',
          brandOnHover && brand && 'transition-[fill] group-hover/brand:[fill:var(--brand)]',
          className,
        )}
        style={brand ? style : undefined}
      >
        {service.gradient && (
          <defs>
            <linearGradient id={gradientId} x1="1" y1="0" x2="0" y2="1">
              <stop offset="0.06" stopColor={service.gradient[0]} />
              <stop offset="0.94" stopColor={service.gradient[1]} />
            </linearGradient>
          </defs>
        )}
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
