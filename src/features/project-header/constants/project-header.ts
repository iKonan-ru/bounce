import type { Crumb } from '@/shared/types';

/** Оба направления находятся внутри одного проекта */
export const PROJECT_CRUMBS: Crumb[] = [
  { label: 'Проекты', link: { to: '/projects' } },
];

/** Поле картинки проекта */
export const AVATAR_FIELD = 'avatar';

/** Прогреваемая уменьшенная копия */
export const AVATAR_THUMBS: readonly string[] = ['256x256'];

/** Число участников в компактной шапке */
export const PEOPLE_SHOWN_MAX = 6;
