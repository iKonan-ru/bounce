/** Знак сервиса: один путь SVG в поле 24x24 */
export interface Glyph {
  path: string;
}

/** Сервис ссылки или площадка публикации */
export interface Service {
  id: string;
  name: string;
  icon?: Glyph;
  letter?: string;
  /** Фирменный цвет знака; у сервисов без своего цвета (чёрный TikTok) - нет */
  color?: string;
  /** Фирменный градиент вместо цвета: от верхнего правого угла к нижнему левому */
  gradient?: readonly [string, string];
  /** Адреса сервиса: по ним вставленная ссылка сама находит свой сервис */
  domains?: readonly string[];
}

/** Сервис ссылки и подпись к ней */
export interface LinkMeta {
  service: Service;
  label: string;
}
