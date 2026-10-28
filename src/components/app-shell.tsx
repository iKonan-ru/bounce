import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, Outlet, useLocation, useParams } from '@tanstack/react-router';
import {
  CloudOff,
  DatabaseBackup,
  Disc3,
  FolderOpen,
  ListChecks,
  MessagesSquare,
  Plus,
  Users,
} from 'lucide-react';
import { useEffect } from 'react';
import { Avatar } from '@/components/avatar';
import { ProjectAvatar } from '@/components/images';
import { Logo } from '@/components/logo';
import { useMe } from '@/lib/auth';
import { lastProject, rememberProject } from '@/lib/current-project';
import { useOnline } from '@/lib/offline';
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

type Section = 'songs' | 'plan' | 'notes' | 'settings';

// настройки проекта открываются карандашом у его названия, в меню их нет
const SECTIONS: { id: Section; label: string; icon: typeof Disc3 }[] = [
  { id: 'songs', label: 'Песни', icon: Disc3 },
  { id: 'plan', label: 'План', icon: ListChecks },
  { id: 'notes', label: 'Заметки', icon: MessagesSquare },
];

// раздел проекта по адресу: /p/id и всё про песни - "Песни"
function sectionOf(pathname: string): Section {
  if (/^\/p\/[^/]+\/notes/.test(pathname)) return 'notes';
  if (/^\/p\/[^/]+\/plan/.test(pathname)) return 'plan';
  if (/^\/p\/[^/]+\/settings/.test(pathname)) return 'settings';
  return 'songs';
}

function sectionLink(id: Section, projectId: string) {
  if (id === 'notes') return { to: '/p/$projectId/notes', params: { projectId } } as const;
  if (id === 'plan') return { to: '/p/$projectId/plan', params: { projectId } } as const;
  return { to: '/p/$projectId', params: { projectId } } as const;
}

// Телефон: содержимое во всю ширину, внутри проекта - вкладки внизу. Планшет и компьютер:
// слева панель с проектами и разделами текущего проекта.
function AppLayout() {
  const params = useParams({ strict: false });
  const projectId = params.projectId;
  const { pathname } = useLocation();
  const section = sectionOf(pathname);
  const online = useOnline();

  const projects = useQuery(projectsQuery);
  useEffect(() => {
    if (projectId) rememberProject(projectId);
  }, [projectId]);
  // вкладки проекта внизу и вне проекта ведут в последний открытый (или единственный) проект
  const remembered = lastProject();
  const list = projects.data ?? [];
  const tabProject =
    projectId ??
    (list.some((p) => p.id === remembered)
      ? (remembered ?? undefined)
      : list.length === 1
        ? list[0]?.id
        : undefined);

  return (
    <div className="min-h-dvh md:flex">
      {!online && (
        <div
          role="status"
          className="fixed top-[max(env(safe-area-inset-top),0.5rem)] left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-tape px-3 py-1.5 text-xs font-medium text-tape-ink shadow-lg"
        >
          <CloudOff className="size-3.5" />
          Нет сети
        </div>
      )}
      <Sidebar projectId={projectId} section={section} pathname={pathname} />
      <main
        className={cn(
          // колонкой во всю высоту: страница может прижать свой последний блок к низу (mt-auto)
          'mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col px-4 pt-[max(env(safe-area-inset-top),0.75rem)] md:px-8 md:pt-6 lg:px-10',
          'pb-28 md:pb-12',
        )}
      >
        {/* новая страница мягко всплывает; ключ - адрес, чтобы анимация шла при каждом переходе */}
        <div key={pathname} className="flex flex-1 flex-col animate-enter">
          <Outlet />
        </div>
      </main>
      <TabBar
        projectId={tabProject}
        section={projectId ? section : undefined}
        pathname={pathname}
      />
    </div>
  );
}

// Телефон: вкладки внизу на всех страницах - проекты, разделы текущего проекта и профиль.
function TabBar({
  projectId,
  section,
  pathname,
}: {
  projectId: string | undefined;
  section: Section | undefined;
  pathname: string;
}) {
  const me = useMe();
  const tab = (current: boolean) =>
    cn(
      'group/tab flex flex-col items-center gap-1 py-2 text-[0.6875rem] transition-colors active:text-ink',
      current ? 'font-medium text-ink' : 'text-dim',
    );
  // подложка под значком текущей вкладки
  const pill = (current: boolean) =>
    cn(
      'flex h-7 w-14 items-center justify-center rounded-full transition-[background-color,transform] duration-200 group-active/tab:scale-90',
      current ? 'bg-groove' : 'bg-transparent',
    );
  const onProjects = pathname === '/projects';
  const onMe = pathname === '/me' || pathname.startsWith('/admin');
  const sections = projectId ? SECTIONS : [];
  return (
    <nav
      aria-label="Разделы"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-console/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${sections.length + 2}, minmax(0, 1fr))` }}
      >
        <li>
          <Link
            to="/projects"
            aria-current={onProjects ? 'page' : undefined}
            className={tab(onProjects)}
          >
            <span className={pill(onProjects)}>
              <FolderOpen className="size-5" strokeWidth={1.75} />
            </span>
            Проекты
          </Link>
        </li>
        {projectId &&
          sections.map((s) => (
            <li key={s.id}>
              <Link
                {...sectionLink(s.id, projectId)}
                aria-current={section === s.id ? 'page' : undefined}
                className={tab(section === s.id)}
              >
                <span className={pill(section === s.id)}>
                  <s.icon className="size-5" strokeWidth={1.75} />
                </span>
                {s.label}
              </Link>
            </li>
          ))}
        <li>
          <Link to="/me" aria-current={onMe ? 'page' : undefined} className={tab(onMe)}>
            <span className={pill(onMe)}>
              <Avatar user={me ?? undefined} className="size-5 text-[0.625rem]" />
            </span>
            Профиль
          </Link>
        </li>
      </ul>
    </nav>
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
  const item = 'flex min-h-9 items-center gap-2.5 rounded-lg px-2 text-sm transition-colors';
  const active = 'bg-groove font-medium text-ink';
  const idle = 'text-dim hover:bg-groove/60 hover:text-ink';

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border/70 bg-panel/50 px-3 py-4 md:flex dark:border-border/50 dark:bg-black/10">
      <Link to="/projects" className="flex items-center gap-2 px-2">
        <Logo className="size-7" />
        <span className="font-semibold tracking-tight">Bounce</span>
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
                // открытый проект выделен только цветом текста, подсветка - у раздела под ним:
                // ссылка проекта ведёт туда же, куда "Песни", и двойная подсветка путала
                className={cn(item, current ? 'text-ink hover:bg-groove/60' : idle)}
              >
                <ProjectAvatar project={p} className="size-7 rounded-md text-xs" />
                <span className="truncate font-medium">{p.name}</span>
              </Link>
              {current && (
                <ul className="mt-0.5 mb-2 flex flex-col gap-0.5 pl-4">
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
        {me?.canCreateProjects && (
          <Link to="/projects" search={{ create: true }} className={cn(item, idle)}>
            <Plus className="size-4" />
            Новый проект
          </Link>
        )}
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
          <Avatar user={me ?? undefined} className="size-7 text-xs" />
          <span className="truncate">{me?.name}</span>
        </Link>
      </div>
    </aside>
  );
}
