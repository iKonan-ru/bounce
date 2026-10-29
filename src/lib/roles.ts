import type { Project, User } from './model';

/**
 * Роль в проекте
 *
 * Права проверяет сервер (pb_migrations/1762400000_roles.js), интерфейс только не показывает
 * того, что роли недоступно
 */
export enum ProjectRole {
  Owner = 'owner',
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
const EDIT_ROLES: ReadonlySet<ProjectRole | null> = new Set<ProjectRole>([
  ProjectRole.Owner,
  ProjectRole.Editor,
]);

/** Роли, которые ведут работу по этапам и пишут заметки */
const WORK_ROLES: ReadonlySet<ProjectRole | null> = new Set<ProjectRole>([
  ProjectRole.Owner,
  ProjectRole.Editor,
  ProjectRole.Contributor,
]);

/** Роль человека в проекте; null - не участник */
export function getProjectRole(
  project: Pick<Project, 'owner' | 'editors' | 'contributors' | 'viewers'>,
  userId: string | undefined,
): ProjectRole | null {
  if (!userId) {
    return null;
  }
  if (project.owner === userId) {
    return ProjectRole.Owner;
  }
  const memberRole = MEMBER_ROLES.find((role) =>
    (project[ROLE_FIELD[role]] ?? []).includes(userId),
  );
  return memberRole ?? null;
}

/** Люди проекта по порядку ролей: владелец, редакторы, участники, наблюдатели */
export function getProjectPeople(project: Project): ProjectPerson[] {
  const expanded = project.expand;
  const owner: ProjectPerson[] = expanded?.owner
    ? [{ user: expanded.owner, role: ProjectRole.Owner }]
    : [];
  const members = MEMBER_ROLES.flatMap((role) =>
    (expanded?.[ROLE_FIELD[role]] ?? []).map((user): ProjectPerson => ({ user, role })),
  );
  return [...owner, ...members];
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

/** Права роли в проекте; null - ничего */
export function getAbilities(role: ProjectRole | null): Abilities {
  return {
    canEdit: EDIT_ROLES.has(role),
    canWork: WORK_ROLES.has(role),
    canManage: role === ProjectRole.Owner,
  };
}
