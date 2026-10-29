import type { Abilities, ProjectRole } from './roles';

/** Права текущего пользователя в проекте вместе с его ролью */
export interface Access extends Abilities {
  /** Роль в проекте; null - не участник или проект ещё не загружен */
  role: ProjectRole | null;
}
