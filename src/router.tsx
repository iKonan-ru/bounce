import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { AuthGate, PlainLayout, ProjectLayout } from '@/components/app-shell';
import { lastProject } from '@/lib/current-project';
import { AdminUsersPage } from '@/pages/admin-users';
import { FeedPage } from '@/pages/feed';
import { LoginPage } from '@/pages/login';
import { MePage } from '@/pages/me';
import { PlaceholderPage } from '@/pages/placeholder';
import { ProjectSettingsPage } from '@/pages/project-settings';
import { ProjectsPage } from '@/pages/projects';
import { SetupTotpPage } from '@/pages/setup-2fa';
import { SongPage } from '@/pages/song';
import { SongsPage } from '@/pages/songs';

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
      ? redirect({ to: '/p/$projectId/songs', params: { projectId: p } })
      : redirect({ to: '/projects' });
  },
});

const plainRoute = createRoute({
  getParentRoute: () => appRoute,
  id: 'plain',
  component: PlainLayout,
});
const projectsRoute = createRoute({
  getParentRoute: () => plainRoute,
  path: '/projects',
  component: ProjectsPage,
});
const meRoute = createRoute({ getParentRoute: () => plainRoute, path: '/me', component: MePage });
const usersRoute = createRoute({
  getParentRoute: () => plainRoute,
  path: '/admin/users',
  component: AdminUsersPage,
});

const projectRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'p/$projectId',
  component: ProjectLayout,
});
const projectIndexRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/',
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/p/$projectId/songs', params });
  },
});
const songsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'songs',
  component: SongsPage,
});
const songRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'songs/$songId',
  component: SongPage,
});
const feedRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'feed',
  component: FeedPage,
});
const findingsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'findings',
  component: () => (
    <PlaceholderPage
      title="Находки"
      text="Журнал находок: настройки преампов, кабинетов и подходы, которые сработали, со снимками экрана."
    />
  ),
});
const settingsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'settings',
  component: ProjectSettingsPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  setupRoute,
  appRoute.addChildren([
    indexRoute,
    plainRoute.addChildren([projectsRoute, meRoute, usersRoute]),
    projectRoute.addChildren([
      projectIndexRoute,
      songsRoute,
      songRoute,
      feedRoute,
      findingsRoute,
      settingsRoute,
    ]),
  ]),
]);

export const router = createRouter({ routeTree, defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
