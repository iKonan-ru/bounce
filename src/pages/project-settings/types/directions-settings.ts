import type { Project, ProjectDirection } from '@/entities/project';

/** Сервер не возвращает содержимое карточек и заметок */
export interface DirectionContentBlocker {
  message: string;
  target: 'cards' | 'templates' | 'posts' | 'links' | 'release';
}

/** Причины запрета по направлениям */
export type DirectionsBlockersResponse = Partial<
  Record<ProjectDirection, DirectionContentBlocker | null>
>;

/** Настройки одного направления */
export interface DirectionSettingsProps {
  project: Project;
  isOwner: boolean;
  direction: ProjectDirection;
}
