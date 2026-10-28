import { useQuery } from '@tanstack/react-query';
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
import { AuthGate } from '@/components/app-shell';
import { lastProject } from '@/lib/current-project';
import { projectQuery } from '@/lib/queries';
import { AdminBackupPage } from '@/pages/admin-backup';
import { AdminUsersPage } from '@/pages/admin-users';
import { LoginPage } from '@/pages/login';
import { LyricsPage } from '@/pages/lyrics';
import { MePage } from '@/pages/me';
import { NotesPage } from '@/pages/notes';
import { ProjectPage } from '@/pages/project';
import { ProjectSettingsPage } from '@/pages/project-settings';
import { ProjectsPage } from '@/pages/projects';
import { SetupTotpPage } from '@/pages/setup-2fa';
import { SongPage } from '@/pages/song';
import { SongEditPage } from '@/pages/song-edit';
import { StagePage } from '@/pages/stage';

const rootRoute = createRootRoute({ component: Outlet });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});
const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup-2fa',
  component: SetupTotpPage,
});

// всё остальное - после входа и подключения 2FA (AuthGate)
const appRoute = createRoute({ getParentRoute: () => rootRoute, id: 'app', component: AuthGate });

// старт: последний открытый проект, иначе список проектов
const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  beforeLoad: () => {
    const p = lastProject();
    throw p
      ? redirect({ to: '/p/$projectId', params: { projectId: p } })
      : redirect({ to: '/projects' });
  },
});

type ProjectsSearch = { create?: boolean };
const projectsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/projects',
  validateSearch: (raw: Record<string, unknown>): ProjectsSearch =>
    raw['create'] === true || raw['create'] === 'true' ? { create: true } : {},
  component: ProjectsPage,
});
const meRoute = createRoute({ getParentRoute: () => appRoute, path: '/me', component: MePage });
const usersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/admin/users',
  component: AdminUsersPage,
});
const backupRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/admin/backup',
  component: AdminBackupPage,
});

// проекта нет или доступ к нему закрыли - к списку проектов
function ProjectGuard() {
  const { projectId } = useParams({ from: '/app/p/$projectId' });
  const project = useQuery(projectQuery(projectId));
  // без сети ошибка запроса - не повод уходить: проект открывается из сохранённых данных
  const gone =
    project.error instanceof ClientResponseError &&
    (project.error.status === 403 || project.error.status === 404);
  if (gone) return <Navigate to="/projects" />;
  return <Outlet />;
}

// вкладка на телефоне: на широком экране обе части видны рядом
export type TabSearch = { tab?: 'notes' };
const validateTab = (raw: Record<string, unknown>): TabSearch =>
  raw['tab'] === 'notes' ? { tab: 'notes' } : {};

const projectRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'p/$projectId',
  component: ProjectGuard,
});
const projectIndexRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/',
  validateSearch: validateTab,
  component: ProjectPage,
});
const notesRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'notes',
  component: NotesPage,
});
const settingsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'settings',
  component: ProjectSettingsPage,
});
const songRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'songs/$songId',
  validateSearch: validateTab,
  component: SongPage,
});
const songEditRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'songs/$songId/edit',
  component: SongEditPage,
});
const lyricsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'songs/$songId/lyrics',
  component: LyricsPage,
});
const stageRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'songs/$songId/stages/$stageId',
  component: StagePage,
});

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
      notesRoute,
      settingsRoute,
      songRoute,
      songEditRoute,
      lyricsRoute,
      stageRoute,
    ]),
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
