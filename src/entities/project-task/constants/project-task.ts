/** Те же состояния карточки, что у видео. */
export const TASK_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Не начата' },
  { value: 'active', label: 'В работе' },
  { value: 'paused', label: 'На паузе' },
  { value: 'done', label: 'Готово' },
] as const;
