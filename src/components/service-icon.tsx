import { Link2 } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useId } from 'react';
import type { Service, Glyph } from '@/lib/services';
import { OTHER_SERVICE } from '@/lib/services';
import { cn } from '@/shared/utils';

/** Начало id фирменного градиента */
const GRADIENT_ID_PREFIX = 'brand-';

/** Двоеточия в id от useId: в ссылке url(#...) они не нужны */
const COLON_RE = /:/g;

/** Стиль знака с фирменным цветом в CSS-переменной */
interface BrandStyle extends CSSProperties {
  '--brand'?: string;
}

/** Пропсы значка сервиса */
interface ServiceIconProps {
  service: Service;
  className?: string;
  /** Знак фирменного цвета, а не цвета текста */
  isColored?: boolean;
  /**
   * Знак становится фирменным, когда наводят на родителя с классом group/brand
   *
   * У сервисов без своего цвета - просто ярче, как текст рядом
   */
  shouldBrandOnHover?: boolean;
}

/** Пропсы знака сервиса */
interface ServiceGlyphProps {
  service: Service;
  glyph: Glyph;
  className: string | undefined;
  isColored: boolean;
  shouldBrandOnHover: boolean;
}

/** Пропсы фирменного градиента */
interface BrandGradientProps {
  id: string;
  gradient: readonly [string, string];
}

/** Фирменный градиент: от верхнего правого угла к нижнему левому */
function BrandGradient({ id, gradient }: BrandGradientProps): ReactNode {
  const [fromColor, toColor] = gradient;

  return (
    <defs>
      <linearGradient id={id} x1="1" y1="0" x2="0" y2="1">
        <stop offset="0.06" stopColor={fromColor} />
        <stop offset="0.94" stopColor={toColor} />
      </linearGradient>
    </defs>
  );
}

/** Знак сервиса: цвета текста или фирменного цвета */
function ServiceGlyph({
  service,
  glyph,
  className,
  isColored,
  shouldBrandOnHover,
}: ServiceGlyphProps): ReactNode {
  const reactId = useId();
  const gradientId = `${GRADIENT_ID_PREFIX}${reactId.replace(COLON_RE, '')}`;
  const gradientUrl = `url(#${gradientId})`;
  const brand = service.gradient ? gradientUrl : service.color;
  const hasBrand = Boolean(brand);
  const brandStyle: BrandStyle = {};

  if (brand) {
    brandStyle['--brand'] = brand;
  }

  const svgStyle = brand ? brandStyle : undefined;
  const isBrandFilled = isColored && hasBrand;
  const isBrandOnHover = shouldBrandOnHover && hasBrand;
  const svgClassName = cn(
    'size-5 shrink-0 fill-current',
    {
      '[fill:var(--brand)]': isBrandFilled,
      'transition-[fill] group-hover/brand:[fill:var(--brand)]': isBrandOnHover,
    },
    className
  );

  return (
    <svg
      role="img"
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={svgClassName}
      style={svgStyle}
    >
      {service.gradient && (
        <BrandGradient id={gradientId} gradient={service.gradient} />
      )}
      <path d={glyph.path} />
    </svg>
  );
}

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
