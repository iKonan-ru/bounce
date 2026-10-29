import {
  CloudOff,
  DatabaseBackup,
  Disc3,
  FolderOpen,
  ListChecks,
  type LucideIcon,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Users,
} from 'lucide-react';
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { Avatar, type AvatarUser } from '@/components/avatar';
import { ProjectAvatar } from '@/components/images';
import { Logo } from '@/components/logo';
import { MiniPlayer } from '@/components/mini-player';
import { useMe } from '@/lib/auth';
import { getLastProject, rememberProject } from '@/lib/current-project';
import { useIsRoomyScreen } from '@/lib/media';
import type { Project } from '@/lib/model';
import { useIsOnline } from '@/lib/offline';
import { projectsQuery, subscribeRealtime } from '@/lib/queries';
import { rememberReturn } from '@/lib/return-to';
import { useStoredChoice } from '@/lib/stored-choice';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Link,
  Navigate,
  Outlet,
  useLocation,
  useParams,
} from '@tanstack/react-router';

/** Раздел проекта */
enum ProjectSection {
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
enum AppPath {
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
enum SidebarStoredValue {
  /** Панель открыта */
  Open = 'open',
  /** Панель свёрнута */
  Closed = 'closed',
}

/** Раздел проекта в меню */
interface SectionItem {
  id: ProjectSection;
  label: string;
  icon: LucideIcon;
}

/** Параметры адреса проекта */
interface ProjectParams {
  projectId: string;
}

/** Ссылка на раздел проекта */
interface SectionLink {
  to: '/p/$projectId/notes' | '/p/$projectId/plan' | '/p/$projectId';
  params: ProjectParams;
}

/** Проект с id */
type ProjectWithId = Pick<Project, 'id'>;

/** Пропсы перехода на вход или подключение 2FA */
interface SignInProps {
  /** Адрес входа или подключения 2FA: тип пути - из роутера */
  to: '/login' | '/setup-2fa';
}

/** Адрес, раздел и проект для вкладок */
interface UseAppLayoutResult {
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
interface TabBarProps {
  projectId: string | undefined;
  section: ProjectSection | undefined;
  pathname: string;
}

/** Классы, подписи и данные вкладок внизу */
interface UseTabBarResult {
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
interface TabBarSectionItemProps {
  item: SectionItem;
  projectId: string;
  currentSection: ProjectSection | undefined;
}

/** Пропсы боковой панели */
interface SidebarProps {
  projectId: string | undefined;
  section: ProjectSection;
  pathname: string;
}

/** Состояние, классы и подписи боковой панели */
interface UseSidebarResult {
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
interface NavLabelProps {
  text: string;
  isWide: boolean;
}

/** Пропсы проекта в боковой панели */
interface SidebarProjectItemProps {
  project: Project;
  currentProjectId: string | undefined;
  section: ProjectSection;
  isWide: boolean;
  itemClassName: string;
}

/** Пропсы раздела проекта в боковой панели */
interface SidebarSectionItemProps {
  item: SectionItem;
  projectId: string;
  currentSection: ProjectSection;
  isWide: boolean;
  itemClassName: string;
}

/** Настройки проекта открываются карандашом у его названия, в меню их нет */
const SECTIONS: readonly SectionItem[] = [
  { id: ProjectSection.Songs, label: 'Песни', icon: Disc3 },
  { id: ProjectSection.Plan, label: 'План', icon: ListChecks },
  { id: ProjectSection.Notes, label: 'Заметки', icon: MessagesSquare },
];

/** Вне проекта разделов во вкладках нет */
const NO_SECTIONS: readonly SectionItem[] = [];

/** Адрес заметок проекта */
const NOTES_PATH_RE = /^\/p\/[^/]+\/notes/;

/** Адрес плана проекта */
const PLAN_PATH_RE = /^\/p\/[^/]+\/plan/;

/** Адрес настроек проекта */
const SETTINGS_PATH_RE = /^\/p\/[^/]+\/settings/;

/** Начало адресов страниц администратора */
const ADMIN_PATH_PREFIX = '/admin';

/** Вкладки внизу помимо разделов проекта: проекты и профиль */
const FIXED_TAB_COUNT = 2;

/** Ключ состояния боковой панели в localStorage */
const SIDEBAR_KEY = 'bounce.sidebar';

/** CSS-переменная ширины места панели */
const SIDEBAR_WIDTH_VAR = '--sidebar';

/** Ширина развёрнутой панели */
const SIDEBAR_WIDE_WIDTH = '15rem';

/** Ширина панели, свёрнутой до значков */
const SIDEBAR_NARROW_WIDTH = '4rem';

/** Клавиша, которая закрывает панель поверх страницы */
const ESCAPE_KEY = 'Escape';

/** Параметры адреса, которые открывают создание проекта */
const CREATE_PROJECT_SEARCH = { create: true };

/**
 * Содержимое страницы: колонкой во всю высоту, чтобы страница могла прижать свой последний
 * блок к низу (mt-auto)
 */
const MAIN_CLASS_NAME = cn(
  'mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col px-4 pt-[max(env(safe-area-inset-top),0.75rem)] md:px-8 md:pt-6 lg:px-10',
  'pb-28 md:pb-12'
);

/** Раздел проекта по адресу: /p/id и всё про песни - "Песни" */
function getSection(pathname: string): ProjectSection {
  if (NOTES_PATH_RE.test(pathname)) {
    return ProjectSection.Notes;
  }

  if (PLAN_PATH_RE.test(pathname)) {
    return ProjectSection.Plan;
  }

  if (SETTINGS_PATH_RE.test(pathname)) {
    return ProjectSection.Settings;
  }

  return ProjectSection.Songs;
}

/** Ссылка на раздел проекта */
function getSectionLink(id: ProjectSection, projectId: string): SectionLink {
  if (id === ProjectSection.Notes) {
    return { to: '/p/$projectId/notes', params: { projectId } };
  }

  if (id === ProjectSection.Plan) {
    return { to: '/p/$projectId/plan', params: { projectId } };
  }

  return { to: '/p/$projectId', params: { projectId } };
}

/** Проект для вкладок вне проекта: последний открытый, если он в списке, иначе единственный */
function getFallbackProject(
  list: readonly ProjectWithId[],
  remembered: string | null
): string | undefined {
  if (remembered) {
    const isRememberedListed = list.some(
      (project) => project.id === remembered
    );

    if (isRememberedListed) {
      return remembered;
    }
  }

  if (list.length === 1) {
    return list[0]?.id;
  }

  return undefined;
}

/** Отметка текущей страницы для экранного диктора */
function getAriaCurrent(isCurrent: boolean): 'page' | undefined {
  if (!isCurrent) {
    return undefined;
  }

  return 'page';
}

/** Вкладка внизу */
function getTabClassName(isCurrent: boolean): string {
  return cn(
    'group/tab flex flex-col items-center gap-1 py-2 text-[0.6875rem] transition-colors active:text-ink',
    { 'font-medium text-ink': isCurrent, 'text-dim': !isCurrent }
  );
}

/** Подложка под значком текущей вкладки */
function getTabPillClassName(isCurrent: boolean): string {
  return cn(
    'flex h-7 w-14 items-center justify-center rounded-full transition-[background-color,transform] duration-200 group-active/tab:scale-90',
    { 'bg-groove': isCurrent, 'bg-transparent': !isCurrent }
  );
}

/** Развёрнута, пока её не свернули */
function parseSidebarOpen(raw: string | null): boolean {
  return raw !== SidebarStoredValue.Closed;
}

/** Состояние панели для хранилища */
function getSidebarValue(isOpen: boolean): string {
  if (isOpen) {
    return SidebarStoredValue.Open;
  }

  return SidebarStoredValue.Closed;
}

/** Пункт панели: в развёрнутой - строкой, в свёрнутой - квадратом со значком */
function getNavItemClassName(isWide: boolean): string {
  return cn('flex min-h-9 items-center rounded-lg text-sm transition-colors', {
    'gap-2.5 px-2': isWide,
    'size-10 justify-center self-center': !isWide,
  });
}

/** Ссылка панели: текущая выделена подложкой */
function getNavLinkClassName(
  itemClassName: string,
  isCurrent: boolean
): string {
  return cn(itemClassName, {
    'bg-groove font-medium text-ink': isCurrent,
    'text-dim hover:bg-groove/60 hover:text-ink': !isCurrent,
  });
}

/** Всплывающая подсказка пункта: только в свёрнутой панели */
function getNavTip(text: string, isWide: boolean): string | undefined {
  if (isWide) {
    return undefined;
  }

  return text;
}

/** Всё, кроме входа и подключения 2FA: нет входа - на вход, нет 2FA - на её подключение */
export function AuthGate(): ReactNode {
  const me = useMe();
  const client = useQueryClient();
  const isReady = me?.isTotpEnabled === true;

  useEffect(() => {
    if (!isReady) {
      return undefined;
    }

    return subscribeRealtime(client);
  }, [isReady, client]);

  if (!me) {
    return <SignIn to="/login" />;
  }

  if (!me.isTotpEnabled) {
    return <SignIn to="/setup-2fa" />;
  }

  return <AppLayout />;
}

/**
 * На вход или подключение 2FA - запомнив, куда шли (lib/return-to.ts)
 *
 * Адрес - из window.location, а не useLocation: подписка на смену адреса перерисовывала бы
 * Navigate во время перехода, и он переходил бы снова и снова
 */
function SignIn({ to }: SignInProps): ReactNode {
  useEffect(() => {
    const { pathname, search, hash } = window.location;
    rememberReturn(pathname + search + hash);
  }, []);

  return <Navigate to={to} />;
}

/** Адрес, текущий проект и раздел, проект для вкладок */
function useAppLayout(): UseAppLayoutResult {
  const params = useParams({ strict: false });
  const projectId = params.projectId;
  const { pathname } = useLocation();
  const section = getSection(pathname);
  const isOnline = useIsOnline();

  const projects = useQuery(projectsQuery);
  useEffect(() => {
    if (projectId) {
      rememberProject(projectId);
    }
  }, [projectId]);
  // вкладки проекта внизу и вне проекта ведут в последний открытый (или единственный) проект
  const remembered = getLastProject();
  const list = projects.data ?? [];
  const tabProjectId = projectId ?? getFallbackProject(list, remembered);
  let tabSection: ProjectSection | undefined;

  if (projectId) {
    tabSection = section;
  }

  return { projectId, pathname, section, isOnline, tabProjectId, tabSection };
}

/**
 * Каркас приложения
 *
 * Телефон: содержимое во всю ширину, внутри проекта - вкладки внизу. Планшет и компьютер: слева
 * панель с проектами и разделами текущего проекта, её можно свернуть до значков
 */
function AppLayout(): ReactNode {
  const { projectId, pathname, section, isOnline, tabProjectId, tabSection } =
    useAppLayout();

  return (
    <div className="min-h-dvh md:flex">
      {!isOnline && (
        <div
          role="status"
          className="fixed top-[max(env(safe-area-inset-top),0.5rem)] left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-tape px-3 py-1.5 text-xs font-medium text-tape-ink shadow-lg"
        >
          <CloudOff className="size-3.5" />
          Нет сети
        </div>
      )}
      <Sidebar projectId={projectId} section={section} pathname={pathname} />
      <main className={MAIN_CLASS_NAME}>
        {/* новая страница мягко всплывает; ключ - адрес, чтобы анимация шла при каждом переходе */}
        <div key={pathname} className="flex flex-1 flex-col animate-enter">
          <Outlet />
        </div>
        {/* плеер вне страницы: запись играет дальше при переходах */}
        <MiniPlayer />
      </main>
      <TabBar
        projectId={tabProjectId}
        section={tabSection}
        pathname={pathname}
      />
    </div>
  );
}

/** Какая вкладка текущая, классы вкладок и сетка */
function useTabBar({
  projectId,
  pathname,
}: Omit<TabBarProps, 'section'>): UseTabBarResult {
  const me = useMe();
  const isOnProjects = pathname === AppPath.Projects;
  const isOnProfile = pathname === AppPath.Me;
  const isOnAdmin = pathname.startsWith(ADMIN_PATH_PREFIX);
  const isOnMe = isOnProfile || isOnAdmin;
  let sections = NO_SECTIONS;

  if (projectId) {
    sections = SECTIONS;
  }

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${sections.length + FIXED_TAB_COUNT}, minmax(0, 1fr))`,
  };

  return {
    avatarUser: me ?? undefined,
    sections,
    gridStyle,
    projectsAriaCurrent: getAriaCurrent(isOnProjects),
    projectsTabClassName: getTabClassName(isOnProjects),
    projectsPillClassName: getTabPillClassName(isOnProjects),
    meAriaCurrent: getAriaCurrent(isOnMe),
    meTabClassName: getTabClassName(isOnMe),
    mePillClassName: getTabPillClassName(isOnMe),
  };
}

/** Вкладка раздела текущего проекта */
function TabBarSectionItem({
  item,
  projectId,
  currentSection,
}: TabBarSectionItemProps): ReactNode {
  const isCurrent = currentSection === item.id;
  const sectionLink = getSectionLink(item.id, projectId);
  const ariaCurrent = getAriaCurrent(isCurrent);
  const tabClassName = getTabClassName(isCurrent);
  const pillClassName = getTabPillClassName(isCurrent);
  const SectionIcon = item.icon;

  return (
    <li>
      <Link
        {...sectionLink}
        aria-current={ariaCurrent}
        className={tabClassName}
      >
        <span className={pillClassName}>
          <SectionIcon className="size-5" strokeWidth={1.75} />
        </span>
        {item.label}
      </Link>
    </li>
  );
}

/** Телефон: вкладки внизу на всех страницах - проекты, разделы текущего проекта и профиль */
function TabBar({ projectId, section, pathname }: TabBarProps): ReactNode {
  const {
    avatarUser,
    sections,
    gridStyle,
    projectsAriaCurrent,
    projectsTabClassName,
    projectsPillClassName,
    meAriaCurrent,
    meTabClassName,
    mePillClassName,
  } = useTabBar({ projectId, pathname });

  return (
    <nav
      aria-label="Разделы"
      // пока набирают текст, вкладки не висят над клавиатурой (lib/keyboard.ts)
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-console/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden [html[data-typing]_&]:hidden"
    >
      <ul className="grid" style={gridStyle}>
        <li>
          <Link
            to="/projects"
            aria-current={projectsAriaCurrent}
            className={projectsTabClassName}
          >
            <span className={projectsPillClassName}>
              <FolderOpen className="size-5" strokeWidth={1.75} />
            </span>
            Проекты
          </Link>
        </li>
        {projectId &&
          sections.map((item) => (
            <TabBarSectionItem
              key={item.id}
              item={item}
              projectId={projectId}
              currentSection={section}
            />
          ))}
        <li>
          <Link
            to="/me"
            aria-current={meAriaCurrent}
            className={meTabClassName}
          >
            <span className={mePillClassName}>
              <Avatar user={avatarUser} className="size-5 text-[0.625rem]" />
            </span>
            Профиль
          </Link>
        </li>
      </ul>
    </nav>
  );
}

/** Развёрнута ли панель, закрытие поверх страницы, классы и подписи пунктов */
function useSidebar({
  pathname,
}: Pick<SidebarProps, 'pathname'>): UseSidebarResult {
  const me = useMe();
  const projects = useQuery(projectsQuery);
  const isRoomy = useIsRoomyScreen();
  const [isPinned, setIsPinned] = useStoredChoice(
    SIDEBAR_KEY,
    parseSidebarOpen,
    true,
    getSidebarValue
  );
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const isWide = isRoomy ? isPinned : isOverlayOpen;
  const isFloating = !isRoomy && isOverlayOpen;
  const isPinnedWide = isRoomy && isPinned;

  // ширина места панели - для полосы плеера, закреплённой над низом экрана
  useEffect(() => {
    const width = isPinnedWide ? SIDEBAR_WIDE_WIDTH : SIDEBAR_NARROW_WIDTH;
    document.documentElement.style.setProperty(SIDEBAR_WIDTH_VAR, width);
  }, [isPinnedWide]);

  // переход или переход на просторный экран закрывает панель поверх страницы

  useEffect(() => {
    setIsOverlayOpen(false);
  }, [pathname, isRoomy]);
  useEffect(() => {
    if (!isFloating) {
      return;
    }

    const onDocumentKeyDown = (event: KeyboardEvent): void => {
      if (event.key === ESCAPE_KEY) {
        setIsOverlayOpen(false);
      }
    };
    document.addEventListener('keydown', onDocumentKeyDown);

    return () => document.removeEventListener('keydown', onDocumentKeyDown);
  }, [isFloating]);

  const onToggleClick = (): void => {
    if (!isRoomy) {
      setIsOverlayOpen((isOpen) => !isOpen);

      return;
    }

    // без хранилища панель просто не запомнит выбор
    setIsPinned(!isPinned);
  };
  const onBackdropClick = (): void => {
    setIsOverlayOpen(false);
  };

  const itemClassName = getNavItemClassName(isWide);
  const placeClassName = cn(
    'sticky top-0 hidden h-dvh shrink-0 transition-[width] duration-200 ease-out-soft md:block',
    { 'w-60': isPinnedWide, 'w-16': !isPinnedWide, 'z-50': isFloating }
  );
  const asideClassName = cn(
    'flex h-full flex-col gap-6 overflow-x-hidden overflow-y-auto border-r border-border/70 py-4 transition-[width] duration-200 ease-out-soft dark:border-border/50',
    { 'w-60 px-3': isWide, 'w-16 px-3': !isWide },
    {
      'fixed top-0 left-0 h-dvh bg-console shadow-2xl': isFloating,
      'bg-panel/50 dark:bg-black/10': !isFloating,
    }
  );
  const headerClassName = cn('flex items-center gap-1', {
    'justify-between': isWide,
    'flex-col gap-3': !isWide,
  });
  const logoLinkClassName = cn('flex items-center gap-2', { 'px-2': isWide });
  const toggleLabel = isWide ? 'Свернуть панель' : 'Развернуть панель';
  const isOnUsers = pathname === AppPath.AdminUsers;
  const isOnBackup = pathname === AppPath.AdminBackup;
  const isOnProfile = pathname === AppPath.Me;
  const isOnProjects = pathname === AppPath.Projects;
  const profileClassName = cn(itemClassName, 'mt-2', {
    'bg-groove font-medium text-ink': isOnProfile,
    'text-dim hover:bg-groove/60 hover:text-ink': !isOnProfile,
  });

  return {
    projects: projects.data,
    avatarUser: me ?? undefined,
    canCreateProjects: Boolean(me?.canCreateProjects),
    isAdmin: Boolean(me?.isAdmin),
    isWide,
    isFloating,
    itemClassName,
    placeClassName,
    asideClassName,
    headerClassName,
    logoLinkClassName,
    toggleLabel,
    logoTitle: getNavTip('Bounce', isWide),
    projectsLinkClassName: getNavLinkClassName(itemClassName, isOnProjects),
    newProjectTitle: getNavTip('Новый проект', isWide),
    newProjectClassName: getNavLinkClassName(itemClassName, false),
    usersTitle: getNavTip('Пользователи', isWide),
    usersClassName: getNavLinkClassName(itemClassName, isOnUsers),
    backupTitle: getNavTip('Резервная копия', isWide),
    backupClassName: getNavLinkClassName(itemClassName, isOnBackup),
    profileTitle: getNavTip(me?.name ?? 'Профиль', isWide),
    profileName: me?.name ?? '',
    profileClassName,
    onToggleClick,
    onBackdropClick,
  };
}

/** Подпись пункта: в свёрнутой панели - только для экранного диктора и во всплывающей подсказке */
function NavLabel({ text, isWide }: NavLabelProps): ReactNode {
  const labelClassName = cn('truncate', { 'sr-only': !isWide });

  return <span className={labelClassName}>{text}</span>;
}

/** Раздел открытого проекта в боковой панели */
function SidebarSectionItem({
  item,
  projectId,
  currentSection,
  isWide,
  itemClassName,
}: SidebarSectionItemProps): ReactNode {
  const isCurrent = currentSection === item.id;
  const sectionLink = getSectionLink(item.id, projectId);
  const ariaCurrent = getAriaCurrent(isCurrent);
  const title = getNavTip(item.label, isWide);
  const linkClassName = getNavLinkClassName(itemClassName, isCurrent);
  const SectionIcon = item.icon;

  return (
    <li className="flex flex-col">
      <Link
        {...sectionLink}
        aria-current={ariaCurrent}
        title={title}
        className={linkClassName}
      >
        <SectionIcon className="size-4 shrink-0" strokeWidth={1.75} />
        <NavLabel text={item.label} isWide={isWide} />
      </Link>
    </li>
  );
}

/** Проект в боковой панели; у открытого - его разделы */
function SidebarProjectItem({
  project,
  currentProjectId,
  section,
  isWide,
  itemClassName,
}: SidebarProjectItemProps): ReactNode {
  const isCurrent = project.id === currentProjectId;
  const params: ProjectParams = { projectId: project.id };
  const title = getNavTip(project.name, isWide);
  // открытый проект выделен только цветом текста, подсветка - у раздела под ним: ссылка
  // проекта ведёт туда же, куда "Песни", и двойная подсветка путала
  const linkClassName = cn(itemClassName, {
    'text-ink hover:bg-groove/60': isCurrent,
    'text-dim hover:bg-groove/60 hover:text-ink': !isCurrent,
  });
  const sectionsClassName = cn('mt-0.5 mb-2 flex flex-col gap-0.5', {
    'pl-4': isWide,
  });

  return (
    <div className="flex flex-col">
      <Link
        to="/p/$projectId"
        params={params}
        title={title}
        className={linkClassName}
      >
        <ProjectAvatar
          project={project}
          className="size-7 rounded-md text-xs"
        />
        <NavLabel text={project.name} isWide={isWide} />
      </Link>
      {isCurrent && (
        <ul className={sectionsClassName}>
          {SECTIONS.map((item) => (
            <SidebarSectionItem
              key={item.id}
              item={item}
              projectId={project.id}
              currentSection={section}
              isWide={isWide}
              itemClassName={itemClassName}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Боковая панель (планшет и компьютер)
 *
 * На просторном экране стоит рядом со страницей: развёрнутая или свёрнутая до значков - как
 * оставили. На экране поуже - всегда полоса значков, а развёрнутая ложится поверх страницы и
 * закрывается нажатием мимо, Escape или переходом
 */
function Sidebar({ projectId, section, pathname }: SidebarProps): ReactNode {
  const {
    projects,
    avatarUser,
    canCreateProjects,
    isAdmin,
    isWide,
    isFloating,
    itemClassName,
    placeClassName,
    asideClassName,
    headerClassName,
    logoLinkClassName,
    toggleLabel,
    logoTitle,
    projectsLinkClassName,
    newProjectTitle,
    newProjectClassName,
    usersTitle,
    usersClassName,
    backupTitle,
    backupClassName,
    profileTitle,
    profileName,
    profileClassName,
    onToggleClick,
    onBackdropClick,
  } = useSidebar({ pathname });

  return (
    // место панели в строке: на экране поуже - всегда узкая полоса. Поверх страницы панель
    // поднимается вместе с этим местом: sticky - свой слой, z-index внутри него не помогает
    <div className={placeClassName}>
      {isFloating && (
        <button
          type="button"
          aria-label="Свернуть панель"
          tabIndex={-1}
          onClick={onBackdropClick}
          className="fixed inset-0 cursor-default bg-black/20 animate-in fade-in-0"
        />
      )}
      <aside className={asideClassName}>
        <div className={headerClassName}>
          <Link to="/projects" title={logoTitle} className={logoLinkClassName}>
            <Logo className="size-7" />
            {isWide && (
              <span className="font-semibold tracking-tight">Bounce</span>
            )}
          </Link>
          <button
            type="button"
            onClick={onToggleClick}
            aria-label={toggleLabel}
            title={toggleLabel}
            aria-expanded={isWide}
            className="flex size-8 items-center justify-center rounded-lg text-dim transition-colors hover:bg-groove/60 hover:text-ink"
          >
            {isWide ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeftOpen className="size-4" />
            )}
          </button>
        </div>

        <nav aria-label="Проекты" className="flex flex-col gap-1">
          {isWide ? (
            <Link
              to="/projects"
              className="px-2 pb-1 text-xs font-medium tracking-wide text-dim uppercase hover:text-ink"
            >
              Проекты
            </Link>
          ) : (
            <Link
              to="/projects"
              title="Проекты"
              className={projectsLinkClassName}
            >
              <FolderOpen className="size-4" strokeWidth={1.75} />
              <span className="sr-only">Проекты</span>
            </Link>
          )}
          {projects?.map((project) => (
            <SidebarProjectItem
              key={project.id}
              project={project}
              currentProjectId={projectId}
              section={section}
              isWide={isWide}
              itemClassName={itemClassName}
            />
          ))}
          {canCreateProjects && (
            <Link
              to="/projects"
              search={CREATE_PROJECT_SEARCH}
              title={newProjectTitle}
              className={newProjectClassName}
            >
              <Plus className="size-4 shrink-0" />
              <NavLabel text="Новый проект" isWide={isWide} />
            </Link>
          )}
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          {isAdmin && (
            <>
              <Link
                to="/admin/users"
                title={usersTitle}
                className={usersClassName}
              >
                <Users className="size-4 shrink-0" />
                <NavLabel text="Пользователи" isWide={isWide} />
              </Link>
              <Link
                to="/admin/backup"
                title={backupTitle}
                className={backupClassName}
              >
                <DatabaseBackup className="size-4 shrink-0" />
                <NavLabel text="Резервная копия" isWide={isWide} />
              </Link>
            </>
          )}
          <Link to="/me" title={profileTitle} className={profileClassName}>
            <Avatar user={avatarUser} className="size-7 shrink-0 text-xs" />
            <NavLabel text={profileName} isWide={isWide} />
          </Link>
        </div>
      </aside>
    </div>
  );
}
