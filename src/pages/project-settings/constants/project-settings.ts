import type { SegmentedOption } from '@/shared/types';

/** Разделы настроек проекта */
export const SETTINGS_TABS: readonly SegmentedOption<string>[] = [
  { value: 'general', label: 'Общее' },
  { value: 'music', label: 'Музыка' },
  { value: 'video', label: 'Видео' },
  { value: 'other', label: 'Другое' },
];

/** Id маршрута настроек проекта */
export const SETTINGS_ROUTE_ID = '/app/p/$projectId/settings';

/** Предел длины названия проекта и названия этапа */
export const TITLE_MAX_LENGTH = 120;

/** Поле картинки проекта */
export const AVATAR_FIELD = 'avatar';

/** Размеры уменьшенных копий картинки проекта, которые готовятся заранее */
export const AVATAR_THUMBS: readonly string[] = ['256x256'];

/** Правка проекта, которая убирает картинку */
export const AVATAR_REMOVE_PATCH: Record<string, string> = {
  [AVATAR_FIELD]: '',
};
