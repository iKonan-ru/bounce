import { getLastProject } from '@/entities/project';
import type { AbstractObject } from '@/shared/types';
import { NotFoundScreen, ErrorScreen } from '@/shared/ui';
import { AuthGate } from '@/widgets/app-shell';
import {
  createRootRoute,
  Outlet,
  createRoute,
  redirect,
  createRouter,
  lazyRouteComponent,
} from '@tanstack/react-router';
import { ProjectGuard } from '../ui/project-guard';

/** Значение параметра create в адресе, которое открывает создание проекта */
const CREATE_PARAM_TRUE = 'true';

/** Параметры адреса списка проектов */
interface ProjectsSearch {
  /** Сразу открыть создание проекта */
  create?: boolean;
}

/** Параметры адреса списка проектов из строки адреса */
function parseProjectsSearch(raw: AbstractObject): ProjectsSearch {
  const isCreate = raw.create === true || raw.create === CREATE_PARAM_TRUE;

  if (isCreate) {
    return { create: true };
  }

  return {};
}

/** Корневой маршрут */
const rootRoute = createRootRoute({ component: Outlet });

/** Вход */
const loginRoute = createRoute({
  getParentRoute: (): typeof rootRoute => rootRoute,
  path: '/login',
  component: lazyRouteComponent(() => import('@/pages/login'), 'LoginPage'),
});

/** Подключение 2FA */
const setupRoute = createRoute({
  getParentRoute: (): typeof rootRoute => rootRoute,
  path: '/setup-2fa',
  component: lazyRouteComponent(
    () => import('@/pages/setup-2fa'),
    'SetupTotpPage'
  ),
});

/** Всё остальное - после входа и подключения 2FA (AuthGate) */
const appRoute = createRoute({
  getParentRoute: (): typeof rootRoute => rootRoute,
  id: 'app',
  component: AuthGate,
});

/** Старт: последний открытый проект, иначе список проектов */
const indexRoute = createRoute({
  getParentRoute: (): typeof appRoute => appRoute,
  path: '/',
  beforeLoad: (): never => {
    const lastProjectId = getLastProject();

    if (lastProjectId) {
      throw redirect({
        to: '/p/$projectId',
        params: { projectId: lastProjectId },
      });
    }

    throw redirect({ to: '/projects' });
  },
});

/** Список проектов */
const projectsRoute = createRoute({
  getParentRoute: (): typeof appRoute => appRoute,
  path: '/projects',
  validateSearch: parseProjectsSearch,
  component: lazyRouteComponent(
    () => import('@/pages/projects'),
    'ProjectsPage'
  ),
});

/** Профиль */
const meRoute = createRoute({
  getParentRoute: (): typeof appRoute => appRoute,
  path: '/me',
  component: lazyRouteComponent(() => import('@/pages/me'), 'MePage'),
});

/** Пользователи (главный пользователь) */
const usersRoute = createRoute({
  getParentRoute: (): typeof appRoute => appRoute,
  path: '/admin/users',
  component: lazyRouteComponent(
    () => import('@/pages/admin-users'),
    'AdminUsersPage'
  ),
});

/** Резервные копии (главный пользователь) */
const backupRoute = createRoute({
  getParentRoute: (): typeof appRoute => appRoute,
  path: '/admin/backup',
  component: lazyRouteComponent(
    () => import('@/pages/admin-backup'),
    'AdminBackupPage'
  ),
});

/** Проект */
const projectRoute = createRoute({
  getParentRoute: (): typeof appRoute => appRoute,
  path: 'p/$projectId',
  component: ProjectGuard,
});

/** Песни проекта */
const projectIndexRoute = createRoute({
  getParentRoute: (): typeof projectRoute => projectRoute,
  path: '/',
  component: lazyRouteComponent(() => import('@/pages/project'), 'ProjectPage'),
});

/** План проекта */
const planRoute = createRoute({
  getParentRoute: (): typeof projectRoute => projectRoute,
  path: 'plan',
  component: lazyRouteComponent(() => import('@/pages/plan'), 'PlanPage'),
});

/** Заметки проекта */
const notesRoute = createRoute({
  getParentRoute: (): typeof projectRoute => projectRoute,
  path: 'notes',
  component: lazyRouteComponent(() => import('@/pages/notes'), 'NotesPage'),
});

/** Настройки проекта */
const settingsRoute = createRoute({
  getParentRoute: (): typeof projectRoute => projectRoute,
  path: 'settings',
  component: lazyRouteComponent(
    () => import('@/pages/project-settings'),
    'ProjectSettingsPage'
  ),
});

/** Песня */
const songRoute = createRoute({
  getParentRoute: (): typeof projectRoute => projectRoute,
  path: 'songs/$songId',
  component: lazyRouteComponent(() => import('@/pages/song'), 'SongPage'),
});

/** Правка песни */
const songEditRoute = createRoute({
  getParentRoute: (): typeof projectRoute => projectRoute,
  path: 'songs/$songId/edit',
  component: lazyRouteComponent(
    () => import('@/pages/song-edit'),
    'SongEditPage'
  ),
});

/** Текст песни */
const lyricsRoute = createRoute({
  getParentRoute: (): typeof projectRoute => projectRoute,
  path: 'songs/$songId/lyrics',
  component: lazyRouteComponent(() => import('@/pages/lyrics'), 'LyricsPage'),
});

/** Этап песни */
const stageRoute = createRoute({
  getParentRoute: (): typeof projectRoute => projectRoute,
  path: 'songs/$songId/stages/$stageId',
  component: lazyRouteComponent(() => import('@/pages/stage'), 'StagePage'),
});

/** Дерево маршрутов */
const routeTree = rootRoute.addChildren([
  loginRoute,
  setupRoute,
  appRoute.addChildren([
    indexRoute,
    projectsRoute,
    meRoute,
    usersRoute,
    backupRoute,
    projectRoute.addChildren([
      projectIndexRoute,
      planRoute,
      notesRoute,
      settingsRoute,
      songRoute,
      songEditRoute,
      lyricsRoute,
      stageRoute,
    ]),
  ]),
]);

/** Маршрутизатор приложения */
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  /** Свои страницы вместо английской заглушки и белого экрана */
  defaultNotFoundComponent: NotFoundScreen,
  defaultErrorComponent: ErrorScreen,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
