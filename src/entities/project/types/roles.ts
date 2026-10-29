import type { User } from '@/entities/user';

/**
 * Роль в проекте
 *
 * Права проверяет сервер (pb_migrations/1762400000_roles.js), интерфейс только не показывает
 * того, что роли недоступно
 */
export enum ProjectRole {
  /** Владелец: создатель проекта, выбирает людей проекта и их роли */
  Owner = 'owner',
  /** Редактор: песни, этапы, обложки, текст, релиз, заметки */
  Editor = 'editor',
  /** Участник: ведёт этапы и пишет заметки */
  Contributor = 'contributor',
  /** Наблюдатель: только смотрит */
  Viewer = 'viewer',
}

/** Роль участника проекта, кроме владельца */
export type MemberRole = Exclude<ProjectRole, ProjectRole.Owner>;

/** Человек проекта со своей ролью */
export interface ProjectPerson {
  user: User;
  role: ProjectRole;
}

/** Что можно роли в проекте */
export interface Abilities {
  /** Песни, обложки, текст, релиз, состав и порядок этапов, шаблон этапов */
  canEdit: boolean;
  /** Статусы, сроки и подэтапы этапов, свои заметки */
  canWork: boolean;
  /** Название, аватар, участники и удаление проекта */
  canManage: boolean;
}
