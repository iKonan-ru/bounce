import type { Project } from '../types/project';
import type { MemberRole } from '../types/roles';
import { ProjectRole } from '../types/roles';

/** Подписи ролей */
export const ROLE_LABEL: Record<ProjectRole, string> = {
  [ProjectRole.Owner]: 'Владелец',
  [ProjectRole.Editor]: 'Редактор',
  [ProjectRole.Contributor]: 'Участник',
  [ProjectRole.Viewer]: 'Наблюдатель',
};

/** Что может каждая роль - для подсказки при выборе */
export const ROLE_HINT: Record<ProjectRole, string> = {
  [ProjectRole.Owner]: 'Всё, включая участников и удаление проекта',
  [ProjectRole.Editor]: 'Песни, этапы, обложки, текст, релиз, заметки',
  [ProjectRole.Contributor]: 'Статусы и подэтапы этапов, заметки',
  [ProjectRole.Viewer]: 'Только смотрит',
};

/** Роли участников по порядку */
export const MEMBER_ROLES: readonly MemberRole[] = [
  ProjectRole.Editor,
  ProjectRole.Contributor,
  ProjectRole.Viewer,
];

/** Поле проекта со списком людей этой роли */
export const ROLE_FIELD = {
  [ProjectRole.Editor]: 'editors',
  [ProjectRole.Contributor]: 'contributors',
  [ProjectRole.Viewer]: 'viewers',
} as const satisfies Record<MemberRole, keyof Project>;

/** Роли, которые правят песни, этапы и шаблон */
export const EDIT_ROLES: ReadonlySet<ProjectRole | null> = new Set<ProjectRole>(
  [ProjectRole.Owner, ProjectRole.Editor]
);

/** Роли, которые ведут работу по этапам и пишут заметки */
export const WORK_ROLES: ReadonlySet<ProjectRole | null> = new Set<ProjectRole>(
  [ProjectRole.Owner, ProjectRole.Editor, ProjectRole.Contributor]
);
