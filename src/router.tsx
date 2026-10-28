import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { AppShell } from '@/components/app-shell';
import { LoginPage } from '@/pages/login';
import { PlaceholderPage } from '@/pages/placeholder';
import { SongPage } from '@/pages/song';
import { SongsPage } from '@/pages/songs';

const rootRoute = createRootRoute({ component: Outlet });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

// всё, кроме входа, - за входом: AppShell уводит на /login, если сессии нет
const appRoute = createRoute({ getParentRoute: () => rootRoute, id: 'app', component: AppShell });

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/songs' });
  },
});

const songsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/songs',
  component: SongsPage,
});

const songRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/songs/$songId',
  component: SongPage,
});

const ideasRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/ideas',
  component: () => (
    <PlaceholderPage
      title="Идеи"
      text="Здесь будут идеи для песен и видео: записать текстом за пару секунд и превратить в песню."
    />
  ),
});

const findingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/findings',
  component: () => (
    <PlaceholderPage
      title="Находки"
      text="Здесь будет журнал находок: настройки преампов, кабинетов и подходы, которые сработали."
    />
  ),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([indexRoute, songsRoute, songRoute, ideasRoute, findingsRoute]),
]);

export const router = createRouter({ routeTree, defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
