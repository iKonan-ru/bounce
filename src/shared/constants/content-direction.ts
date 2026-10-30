import { ContentDirection } from '../types/content-direction';

/** Подписи выбора направления в плане и заметках */
export const CONTENT_DIRECTION_OPTIONS = [
  { value: ContentDirection.All, label: 'Все направления' },
  { value: ContentDirection.General, label: 'Общие' },
  { value: ContentDirection.Music, label: 'Музыка' },
  { value: ContentDirection.Video, label: 'Видео' },
];
