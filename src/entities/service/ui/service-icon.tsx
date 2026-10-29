import { Link2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';
import { OTHER_SERVICE } from '../constants/services';
import type { ServiceIconProps } from '../types/service-icon';
import { ServiceGlyph } from './service-glyph';

/**
 * Значок сервиса: знак (цвета текста или, с isColored, фирменного цвета) или нейтральная плашка
 * с буквой
 *
 * С brandOnHover знак становится фирменным, когда наводят на родителя с классом group/brand; у
 * сервисов без своего цвета - просто ярче, как текст рядом
 */
export function ServiceIcon({
  service,
  className,
  isColored = false,
  shouldBrandOnHover = false,
}: ServiceIconProps): ReactNode {
  if (service.id === OTHER_SERVICE.id) {
    const linkClassName = cn('size-5 shrink-0', className);

    return <Link2 aria-hidden="true" className={linkClassName} />;
  }

  if (service.icon) {
    return (
      <ServiceGlyph
        service={service}
        glyph={service.icon}
        className={className}
        isColored={isColored}
        shouldBrandOnHover={shouldBrandOnHover}
      />
    );
  }

  const letterClassName = cn(
    'flex size-5 shrink-0 items-center justify-center rounded-md bg-groove text-[0.6875rem] leading-none font-semibold text-ink ring-1 ring-border/60',
    className
  );

  return (
    <span aria-hidden="true" className={letterClassName}>
      {service.letter}
    </span>
  );
}
