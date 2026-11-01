/** Названия разделов проекта */
export const DIRECTION_LABELS = {
  music: 'Музыка',
  video: 'Видео',
  other: 'Другое',
} as const;

/** Адреса разделов проекта */
export const DIRECTION_PATHS = {
  music: '/p/$projectId/songs',
  video: '/p/$projectId/videos',
  other: '/p/$projectId/other',
} as const;
