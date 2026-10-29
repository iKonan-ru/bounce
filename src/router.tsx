import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  redirect,
  useParams,
} from '@tanstack/react-router';
import { ClientResponseError } from 'pocketbase';
import { type ReactNode, useEffect } from 'react';
import { AuthGate } from '@/components/app-shell';
import { ErrorScreen, NotFoundScreen } from '@/components/route-states';
import { forgetProject, getLastProject } from '@/lib/current-project';
import { useIsOnline } from '@/lib/offline';
import { syncProject } from '@/lib/offline-sync';
import { projectQuery } from '@/lib/queries';
import { AdminBackupPage } from '@/pages/admin-backup';
import { AdminUsersPage } from '@/pages/admin-users';
import { LoginPage } from '@/pages/login';
import { LyricsPage } from '@/pages/lyrics';
import { MePage } from '@/pages/me';
import { NotesPage } from '@/pages/notes';
import { PlanPage } from '@/pages/plan';
import { ProjectPage } from '@/pages/project';
import { ProjectSettingsPage } from '@/pages/project-settings';
import { ProjectsPage } from '@/pages/projects';
import { SetupTotpPage } from '@/pages/setup-2fa';
import { SongPage } from '@/pages/song';
import { SongEditPage } from '@/pages/song-edit';
import { StagePage } from '@/pages/stage';

/** Id маршрута проекта */
const PROJECT_ROUTE_ID = '/app/p/$projectId';

/** Значение параметра create в адресе, которое открывает создание проекта */
const CREATE_PARAM_TRUE = 'true';

/** Статусы ответа: проекта нет или доступ к нему закрыли */
const PROJECT_GONE_STATUSES: ReadonlySet<number> = new Set([403, 404]);

/** Параметры адреса списка проектов */
interface ProjectsSearch {
  /** Сразу открыть создание проекта */
  create?: boolean;
}

/** Результат хука охраны проекта */
interface UseProjectGuardResult {
  /** Проекта нет или доступ к нему закрыли */
  isGone: boolean;
}

/** Параметры адреса списка проектов из строки адреса */
function parseProjectsSearch(raw: Record<string, unknown>): ProjectsSearch {
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
  component: LoginPage,
});

/** Подключение 2FA */
const setupRoute = createRoute({
  getParentRoute: (): typeof rootRoute => rootRoute,
  path: '/setup-2fa',
  component: SetupTotpPage,
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
      throw redirect({ to: '/p/$projectId', params: { projectId: lastProjectId } });
    }
    throw redirect({ to: '/projects' });
  },
});

/** Список проектов */
const projectsRoute = createRoute({
  getParentRoute: (): typeof appRoute => appRoute,
  path: '/projects',
  validateSearch: parseProjectsSearch,
  component: ProjectsPage,
});

/** Профиль */
const meRoute = createRoute({
  getParentRoute: (): typeof appRoute => appRoute,
  path: '/me',
  component: MePage,
});

/** Пользователи (главный пользователь) */
const usersRoute = createRoute({
  getParentRoute: (): typeof appRoute => appRoute,
  path: '/admin/users',
  component: AdminUsersPage,
});

/** Резервные копии (главный пользователь) */
const backupRoute = createRoute({
  getParentRoute: (): typeof appRoute => appRoute,
  path: '/admin/backup',
  component: AdminBackupPage,
});

/**
 * Проверка проекта: ушёл ли он, и выгрузка его целиком на устройство
 *
 * Без сети ошибка запроса - не повод уходить: проект открывается из сохранённых данных
 */
function useProjectGuard(): UseProjectGuardResult {
  const { projectId } = useParams({ from: PROJECT_ROUTE_ID });
  const project = useQuery(projectQuery(projectId));
  const queryClient = useQueryClient();
  const isOnline = useIsOnline();
  const isGone =
    project.error instanceof ClientResponseError && PROJECT_GONE_STATUSES.has(project.error.status);

  useEffect(() => {
    if (isGone) {
      forgetProject(projectId);
    }
  }, [isGone, projectId]);

  // проект целиком на устройство - чтобы без сети открывались и страницы, где ещё не были
  useEffect(() => {
    const shouldSync = isOnline && !isGone;
    if (shouldSync) {
      void syncProject(queryClient, projectId);
    }
  }, [queryClient, projectId, isOnline, isGone]);

  return { isGone };
}

/** Проекта нет или доступ к нему закрыли - к списку проектов */
function ProjectGuard(): ReactNode {
  const { isGone } = useProjectGuard();
  if (isGone) {
    return <Navigate to="/projects" />;
  }
  return <Outlet />;
}

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
  component: ProjectPage,
});

/** План проекта */
const planRoute = createRoute({
  getParentRoute: (): typeof projectRoute => projectRoute,
  path: 'plan',
  component: PlanPage,
});

/** Заметки проекта */
const notesRoute = createRoute({
  getParentRoute: (): typeof projectRoute => projectRoute,
  path: 'notes',
  component: NotesPage,
});

/** Настройки проекта */
const settingsRoute = createRoute({
  getParentRoute: (): typeof projectRoute => projectRoute,
  path: 'settings',
  component: ProjectSettingsPage,
});

/** Песня */
const songRoute = createRoute({
  getParentRoute: (): typeof projectRoute => projectRoute,
  path: 'songs/$songId',
  component: SongPage,
});

/** Правка песни */
const songEditRoute = createRoute({
  getParentRoute: (): typeof projectRoute => projectRoute,
  path: 'songs/$songId/edit',
  component: SongEditPage,
});

/** Текст песни */
const lyricsRoute = createRoute({
  getParentRoute: (): typeof projectRoute => projectRoute,
  path: 'songs/$songId/lyrics',
  component: LyricsPage,
});

/** Этап песни */
const stageRoute = createRoute({
  getParentRoute: (): typeof projectRoute => projectRoute,
  path: 'songs/$songId/stages/$stageId',
  component: StagePage,
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
