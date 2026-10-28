import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, Outlet, useParams } from '@tanstack/react-router';
import { ChevronDown, Disc3, MessagesSquare, Settings2, SlidersVertical } from 'lucide-react';
import { useEffect } from 'react';
import { Avatar } from '@/components/avatar';
import { useMe } from '@/lib/auth';
import { rememberProject } from '@/lib/current-project';
import { projectQuery, subscribeRealtime } from '@/lib/queries';

// Всё, кроме входа и подключения 2FA: нет входа - на вход, нет 2FA - на её подключение.
export function AuthGate() {
  const me = useMe();
  const client = useQueryClient();
  const ready = me?.totpEnabled === true;

  useEffect(() => (ready ? subscribeRealtime(client) : undefined), [ready, client]);

  if (!me) return <Navigate to="/login" />;
  if (!me.totpEnabled) return <Navigate to="/setup-2fa" />;
  return <Outlet />;
}

// Экран вне проекта (список проектов, профиль, участники): узкая колонка без нижнего меню.
export function PlainLayout() {
  return (
    <div className="mx-auto min-h-dvh max-w-xl px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-12">
      <Outlet />
    </div>
  );
}

const TABS = [
  { to: '/p/$projectId/songs', label: 'Песни', icon: Disc3 },
  { to: '/p/$projectId/feed', label: 'Лента', icon: MessagesSquare },
  { to: '/p/$projectId/findings', label: 'Находки', icon: SlidersVertical },
  { to: '/p/$projectId/settings', label: 'Проект', icon: Settings2 },
] as const;

export function ProjectLayout() {
  const me = useMe();
  const { projectId } = useParams({ from: '/app/p/$projectId' });
  const project = useQuery(projectQuery(projectId));

  useEffect(() => {
    if (project.data) rememberProject(project.data.id);
  }, [project.data]);

  // проекта нет или доступ к нему закрыли - к списку
  if (project.isError) return <Navigate to="/projects" />;

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-1">
        <Link
          to="/projects"
          className="-ml-2 flex min-h-10 min-w-0 items-center gap-1 rounded-lg px-2 text-sm text-dim active:bg-panel"
        >
          <span className="truncate">{project.data?.name ?? 'Проект'}</span>
          <ChevronDown className="size-4 shrink-0" />
        </Link>
        <Link to="/me" aria-label="Профиль" className="rounded-full">
          <Avatar name={me?.name ?? '?'} />
        </Link>
      </header>
      <main className="flex-1 px-4 pt-3 pb-28">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-console/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto grid max-w-xl grid-cols-4">
          {TABS.map((t) => (
            <li key={t.to}>
              <Link
                to={t.to}
                params={{ projectId }}
                className="flex flex-col items-center gap-1 py-2.5 text-xs text-dim transition-colors data-[status=active]:text-ink"
              >
                <t.icon className="size-5" strokeWidth={1.75} />
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
