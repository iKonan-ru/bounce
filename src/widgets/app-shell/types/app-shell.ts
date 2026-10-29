import type { LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Project } from '@/entities/project';
import type { AvatarUser } from '@/shared/types';

/** Раздел проекта */
export enum ProjectSection {
  /** Песни */
  Songs = 'songs',
  /** План */
  Plan = 'plan',
  /** Заметки */
  Notes = 'notes',
  /** Настройки */
  Settings = 'settings',
}

/** Страницы вне проекта, которые подсвечиваются в меню */
export enum AppPath {
  /** Список проектов */
  Projects = '/projects',
  /** Профиль */
  Me = '/me',
  /** Пользователи (главный пользователь) */
  AdminUsers = '/admin/users',
  /** Резервная копия (главный пользователь) */
  AdminBackup = '/admin/backup',
}

/** Что запомнено о боковой панели на устройстве */
export enum SidebarStoredValue {
  /** Панель открыта */
  Open = 'open',
  /** Панель свёрнута */
  Closed = 'closed',
}

/** Раздел проекта в меню */
export interface SectionItem {
  id: ProjectSection;
  label: string;
  icon: LucideIcon;
}

/** Параметры адреса проекта */
export interface ProjectParams {
  projectId: string;
}

/** Ссылка на раздел проекта */
export interface SectionLink {
  to: '/p/$projectId/notes' | '/p/$projectId/plan' | '/p/$projectId';
  params: ProjectParams;
}

/** Проект с id */
export type ProjectWithId = Pick<Project, 'id'>;

/** Пропсы перехода на вход или подключение 2FA */
export interface SignInProps {
  /** Адрес входа или подключения 2FA: тип пути - из роутера */
  to: '/login' | '/setup-2fa';
}

/** Адрес, раздел и проект для вкладок */
export interface UseAppLayoutResult {
  projectId: string | undefined;
  pathname: string;
  section: ProjectSection;
  isOnline: boolean;
  /** Проект для вкладок внизу: текущий, а вне проекта - последний открытый или единственный */
  tabProjectId: string | undefined;
  /** Раздел для вкладок: только внутри проекта */
  tabSection: ProjectSection | undefined;
}

/** Пропсы вкладок внизу */
export interface TabBarProps {
  projectId: string | undefined;
  section: ProjectSection | undefined;
  pathname: string;
}

/** Классы, подписи и данные вкладок внизу */
export interface UseTabBarResult {
  avatarUser: AvatarUser | undefined;
  sections: readonly SectionItem[];
  gridStyle: CSSProperties;
  projectsAriaCurrent: 'page' | undefined;
  projectsTabClassName: string;
  projectsPillClassName: string;
  meAriaCurrent: 'page' | undefined;
  meTabClassName: string;
  mePillClassName: string;
}

/** Пропсы вкладки раздела проекта */
export interface TabBarSectionItemProps {
  item: SectionItem;
  projectId: string;
  currentSection: ProjectSection | undefined;
}

/** Пропсы боковой панели */
export interface SidebarProps {
  projectId: string | undefined;
  section: ProjectSection;
  pathname: string;
}

/** Состояние, классы и подписи боковой панели */
export interface UseSidebarResult {
  projects: Project[] | undefined;
  avatarUser: AvatarUser | undefined;
  canCreateProjects: boolean;
  isAdmin: boolean;
  isWide: boolean;
  isFloating: boolean;
  itemClassName: string;
  placeClassName: string;
  asideClassName: string;
  headerClassName: string;
  logoLinkClassName: string;
  toggleLabel: string;
  logoTitle: string | undefined;
  projectsLinkClassName: string;
  newProjectTitle: string | undefined;
  newProjectClassName: string;
  usersTitle: string | undefined;
  usersClassName: string;
  backupTitle: string | undefined;
  backupClassName: string;
  profileTitle: string | undefined;
  profileName: string;
  profileClassName: string;
  onToggleClick: () => void;
  onBackdropClick: () => void;
}

/** Пропсы подписи пункта панели */
export interface NavLabelProps {
  text: string;
  isWide: boolean;
}

/** Пропсы проекта в боковой панели */
export interface SidebarProjectItemProps {
  project: Project;
  currentProjectId: string | undefined;
  section: ProjectSection;
  isWide: boolean;
  itemClassName: string;
}

/** Пропсы раздела проекта в боковой панели */
export interface SidebarSectionItemProps {
  item: SectionItem;
  projectId: string;
  currentSection: ProjectSection;
  isWide: boolean;
  itemClassName: string;
}
