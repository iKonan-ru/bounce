import { VideoStatus } from '../types/video';

/** Статусы без музыкального выпуска */
export const VIDEO_STATUS_OPTIONS = [
  { value: VideoStatus.not_started, label: 'Не начато' },
  { value: VideoStatus.active, label: 'В работе' },
  { value: VideoStatus.paused, label: 'На паузе' },
  { value: VideoStatus.done, label: 'Готово' },
];

/** Необязательный формат кадра */
export const VIDEO_ASPECT_OPTIONS = [
  { value: '', label: 'Не указан' },
  ...['16:9', '9:16', '1:1', '4:3'].map((value) => ({ value, label: value })),
];

/** Явно применяемые шаблоны */
export const VIDEO_TEMPLATE_OPTIONS = [
  { value: 'full', label: 'Полный процесс' },
  { value: 'short', label: 'Короткий ролик' },
  { value: 'project', label: 'Шаблон проекта' },
];
