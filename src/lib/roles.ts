import type { Project, User } from './model';

// Роль в проекте. Права проверяет сервер (pb_migrations/1762400000_roles.js), интерфейс только
// не показывает того, что роли недоступно.
export type ProjectRole = 'owner' | 'editor' | 'contributor' | 'viewer';
export type MemberRole = Exclude<ProjectRole, 'owner'>;

export const ROLE_LABEL: Record<ProjectRole, string> = {
  owner: 'Владелец',
  editor: 'Редактор',
  contributor: 'Участник',
  viewer: 'Наблюдатель',
};

// что может каждая роль - для подсказки при выборе
export const ROLE_HINT: Record<ProjectRole, string> = {
  owner: 'Всё, включая участников и удаление проекта',
  editor: 'Песни, этапы, обложки, текст, релиз, заметки',
  contributor: 'Статусы и подэтапы этапов, заметки',
  viewer: 'Только смотрит',
};

export const MEMBER_ROLES: ReadonlyArray<MemberRole> = ['editor', 'contributor', 'viewer'];

// поле проекта со списком людей этой роли
export const ROLE_FIELD = {
  editor: 'editors',
  contributor: 'contributors',
  viewer: 'viewers',
} as const satisfies Record<MemberRole, keyof Project>;

export function projectRole(
  project: Pick<Project, 'owner' | 'editors' | 'contributors' | 'viewers'>,
  userId: string | undefined,
): ProjectRole | null {
  if (!userId) return null;
  if (project.owner === userId) return 'owner';
  for (const role of MEMBER_ROLES) {
    if ((project[ROLE_FIELD[role]] ?? []).includes(userId)) return role;
  }
  return null;
}

// люди проекта по порядку ролей: владелец, редакторы, участники, наблюдатели
export function projectPeople(project: Project): { user: User; role: ProjectRole }[] {
  const e = project.expand;
  const people: { user: User; role: ProjectRole }[] = [];
  if (e?.owner) people.push({ user: e.owner, role: 'owner' });
  for (const role of MEMBER_ROLES) {
    for (const user of e?.[ROLE_FIELD[role]] ?? []) people.push({ user, role });
  }
  return people;
}

export type Abilities = {
  // песни, обложки, текст, релиз, состав и порядок этапов, шаблон этапов
  edit: boolean;
  // статусы, сроки и подэтапы этапов, свои заметки
  work: boolean;
  // название, аватар, участники и удаление проекта
  manage: boolean;
};

export function abilities(role: ProjectRole | null): Abilities {
  return {
    edit: role === 'owner' || role === 'editor',
    work: role === 'owner' || role === 'editor' || role === 'contributor',
    manage: role === 'owner',
  };
}
