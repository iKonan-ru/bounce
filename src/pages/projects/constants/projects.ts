import { GROUP } from '@/shared/constants';
import type { Crumb } from '@/shared/types';
import { cn } from '@/shared/utils';

/** Список проектов - корень пути: хлебных крошек нет */
export const NO_CRUMBS: readonly Crumb[] = [];

/** Сколько аватаров участников показать на карточке проекта */
export const CARD_AVATARS_MAX = 5;

/** Карточка проекта в списке */
export const PROJECT_CARD_CLASS_NAME = cn(
  GROUP,
  'flex items-center gap-4 p-4 transition-colors hover:bg-groove/40 active:bg-groove/70'
);
