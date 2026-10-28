import type {
  NotesResponse,
  ProjectsResponse,
  SongStagesResponse,
  SongStagesStatusOptions,
  SongsResponse,
  SongsStatusOptions,
  StageTemplatesResponse,
  TasksResponse,
  UsersResponse,
} from './pb-types';

// Формы JSON-полей: PocketBase их не проверяет, пишет их только приложение.
export type Substep = { id: string; title: string; done: boolean };
export type TemplateSubstep = { id: string; title: string };

export type User = UsersResponse;
export type Project = ProjectsResponse<{
  owner?: User;
  editors?: User[];
  contributors?: User[];
  viewers?: User[];
}>;
export type Song = SongsResponse;
export type SongStage = SongStagesResponse<Substep[]>;
export type StageTemplate = StageTemplatesResponse<TemplateSubstep[]>;
export type Task = TasksResponse;
export type Note = NotesResponse<{ author?: User; song?: Song; stage?: SongStage }>;

export type StageStatus = SongStagesStatusOptions;
export type SongStatus = SongsStatusOptions;

export const STAGE_STATUS_LABEL: Record<StageStatus, string> = {
  not_started: 'Не начат',
  in_progress: 'В работе',
  done: 'Готово',
  skipped: 'Пропущен',
};

export const STAGE_STATUSES: StageStatus[] = ['not_started', 'in_progress', 'done', 'skipped'];

export const SONG_STATUS_LABEL: Record<SongStatus, string> = {
  active: 'В работе',
  paused: 'На паузе',
  done: 'Готова',
  sent: 'Отправлена на лейбл',
  released: 'Выпущена',
};

export const SONG_STATUSES: SongStatus[] = ['active', 'paused', 'done', 'sent', 'released'];
// статусы, которые выбирают руками; "отправлена" - через раздел "Релиз", "выпущена" - сама
export const MANUAL_SONG_STATUSES: SongStatus[] = ['active', 'paused', 'done'];

// день релиза наступил (по местному времени); дата хранится полднем UTC
export function releaseDue(iso: string | undefined, now = new Date()): boolean {
  const day = (iso ?? '').slice(0, 10);
  if (!day) return false;
  const p = (n: number) => String(n).padStart(2, '0');
  return day <= `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

// статус для показа: сервер переводит отправленную песню в выпущенные раз в час, а здесь это
// видно сразу в день релиза
export function songStatus(song: Pick<Song, 'status' | 'target_release'>): SongStatus {
  return song.status === 'sent' && releaseDue(song.target_release) ? 'released' : song.status;
}

// чего не хватает для отправки на лейбл (так же проверяет сервер, pb_hooks/lib/release.js)
export function releaseMissing(song: {
  lyrics?: string | undefined;
  release_cover?: string | undefined;
}): string[] {
  const missing: string[] = [];
  if (!(song.lyrics ?? '').trim()) missing.push('текст песни');
  if (!song.release_cover) missing.push('обложка для релиза');
  return missing;
}

export const RELEASE_COVER_SIZE = 3000;

// пределы файлов - те же, что в схеме PocketBase
export const MAX_AUDIO_BYTES = 200 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_AUDIO_FILES = 5;
export const MAX_IMAGE_FILES = 10;
export const MAX_COVERS = 30;

// основная обложка песни: выбранная, иначе первая, иначе обложка для релиза
export function mainCover(song: {
  covers?: ReadonlyArray<string> | undefined;
  main_cover?: string | undefined;
  release_cover?: string | undefined;
}): string | undefined {
  const covers = song.covers ?? [];
  return (
    covers.find((c) => c === song.main_cover) ?? covers[0] ?? (song.release_cover || undefined)
  );
}

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
