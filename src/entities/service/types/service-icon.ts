import type { CSSProperties } from 'react';
import type { Service, Glyph } from './services';

/** Стиль знака с фирменным цветом в CSS-переменной */
export interface BrandStyle extends CSSProperties {
  '--brand'?: string;
}

/** Пропсы значка сервиса */
export interface ServiceIconProps {
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
export interface ServiceGlyphProps {
  service: Service;
  glyph: Glyph;
  className: string | undefined;
  isColored: boolean;
  shouldBrandOnHover: boolean;
}

/** Пропсы фирменного градиента */
export interface BrandGradientProps {
  id: string;
  gradient: readonly [string, string];
}
