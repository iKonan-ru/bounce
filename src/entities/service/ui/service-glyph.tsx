import type { ReactNode } from 'react';
import { useId } from 'react';
import { cn } from '@/shared/utils';
import { GRADIENT_ID_PREFIX, COLON_RE } from '../constants/service-icon';
import type {
  BrandGradientProps,
  ServiceGlyphProps,
  BrandStyle,
} from '../types/service-icon';

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
export function ServiceGlyph({
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
