import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, Outlet, useLocation, useParams } from '@tanstack/react-router';
import { DatabaseBackup, Disc3, MessagesSquare, Plus, Settings2, Users } from 'lucide-react';
import { useEffect } from 'react';
import { Avatar } from '@/components/avatar';
import { ProjectAvatar } from '@/components/images';
import { Logo } from '@/components/logo';
import { useMe } from '@/lib/auth';
import { rememberProject } from '@/lib/current-project';
import { projectsQuery, subscribeRealtime } from '@/lib/queries';
import { cn } from '@/lib/utils';

// Всё, кроме входа и подключения 2FA: нет входа - на вход, нет 2FA - на её подключение.
export function AuthGate() {
  const me = useMe();
  const client = useQueryClient();
  const ready = me?.totpEnabled === true;

  useEffect(() => (ready ? subscribeRealtime(client) : undefined), [ready, client]);

  if (!me) return <Navigate to="/login" />;
  if (!me.totpEnabled) return <Navigate to="/setup-2fa" />;
  return <AppLayout />;
}

type Section = 'songs' | 'notes' | 'settings';

const SECTIONS: { id: Section; label: string; icon: typeof Disc3 }[] = [
  { id: 'songs', label: 'Песни', icon: Disc3 },
  { id: 'notes', label: 'Все заметки', icon: MessagesSquare },
  { id: 'settings', label: 'Настройки', icon: Settings2 },
];

// раздел проекта по адресу: /p/id и всё про песни - "Песни"
function sectionOf(pathname: string): Section {
  if (/^\/p\/[^/]+\/notes/.test(pathname)) return 'notes';
  if (/^\/p\/[^/]+\/settings/.test(pathname)) return 'settings';
  return 'songs';
}

function sectionLink(id: Section, projectId: string) {
  if (id === 'notes') return { to: '/p/$projectId/notes', params: { projectId } } as const;
  if (id === 'settings') return { to: '/p/$projectId/settings', params: { projectId } } as const;
  return { to: '/p/$projectId', params: { projectId } } as const;
}

// Телефон: содержимое во всю ширину, внутри проекта - вкладки внизу. Планшет и компьютер:
// слева панель с проектами и разделами текущего проекта.
function AppLayout() {
  const params = useParams({ strict: false });
  const projectId = params.projectId;
  const { pathname } = useLocation();
  const section = sectionOf(pathname);

  useEffect(() => {
    if (projectId) rememberProject(projectId);
  }, [projectId]);

  return (
    <div className="min-h-dvh md:flex">
      <Sidebar projectId={projectId} section={section} pathname={pathname} />
      <main
        className={cn(
          'mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] md:px-8 md:pt-6 lg:px-10',
          projectId ? 'pb-28 md:pb-12' : 'pb-12',
        )}
      >
        <Outlet />
      </main>
      {projectId && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-console/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <ul className="grid grid-cols-3">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <Link
                  {...sectionLink(s.id, projectId)}
                  aria-current={section === s.id ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 text-xs transition-colors',
                    section === s.id ? 'text-ink' : 'text-dim',
                  )}
                >
                  <s.icon className="size-5" strokeWidth={1.75} />
                  {s.id === 'notes' ? 'Заметки' : s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

function Sidebar({
  projectId,
  section,
  pathname,
}: {
  projectId: string | undefined;
  section: Section;
  pathname: string;
}) {
  const me = useMe();
  const projects = useQuery(projectsQuery);
  const item = 'flex min-h-10 items-center gap-3 rounded-lg px-2 text-sm transition-colors';
  const active = 'bg-groove text-ink';
  const idle = 'text-dim hover:bg-groove/60 hover:text-ink';

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r bg-panel/60 px-3 py-5 md:flex">
      <Link to="/projects" className="flex items-center gap-2 px-2">
        <Logo className="size-8" />
        <span className="text-lg font-semibold tracking-tight">Bounce</span>
      </Link>

      <nav aria-label="Проекты" className="flex flex-col gap-1">
        <Link
          to="/projects"
          className={cn(
            'px-2 pb-1 text-xs font-medium tracking-wide text-dim uppercase hover:text-ink',
          )}
        >
          Проекты
        </Link>
        {projects.data?.map((p) => {
          const current = p.id === projectId;
          return (
            <div key={p.id}>
              <Link
                to="/p/$projectId"
                params={{ projectId: p.id }}
                className={cn(
                  item,
                  current && section === 'songs' && pathname === `/p/${p.id}`
                    ? active
                    : current
                      ? 'text-ink'
                      : idle,
                )}
              >
                <ProjectAvatar project={p} className="size-7 rounded-md text-xs" />
                <span className="truncate font-medium">{p.name}</span>
              </Link>
              {current && (
                <ul className="mt-1 mb-2 ml-5 flex flex-col gap-0.5 border-l pl-3">
                  {SECTIONS.map((s) => (
                    <li key={s.id}>
                      <Link
                        {...sectionLink(s.id, p.id)}
                        aria-current={section === s.id ? 'page' : undefined}
                        className={cn(item, 'min-h-9', section === s.id ? active : idle)}
                      >
                        <s.icon className="size-4" strokeWidth={1.75} />
                        {s.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        <Link to="/projects" search={{ create: true }} className={cn(item, idle)}>
          <Plus className="size-4" />
          Новый проект
        </Link>
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        {me?.isAdmin && (
          <>
            <Link
              to="/admin/users"
              className={cn(item, pathname === '/admin/users' ? active : idle)}
            >
              <Users className="size-4" />
              Пользователи
            </Link>
            <Link
              to="/admin/backup"
              className={cn(item, pathname === '/admin/backup' ? active : idle)}
            >
              <DatabaseBackup className="size-4" />
              Резервная копия
            </Link>
          </>
        )}
        <Link to="/me" className={cn(item, 'mt-2', pathname === '/me' ? active : idle)}>
          <Avatar name={me?.name ?? '?'} className="size-7 text-xs" />
          <span className="truncate">{me?.name}</span>
        </Link>
      </div>
    </aside>
  );
}
