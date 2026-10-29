import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, Outlet, useLocation, useParams } from '@tanstack/react-router';
import {
  CloudOff,
  DatabaseBackup,
  Disc3,
  FolderOpen,
  ListChecks,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar } from '@/components/avatar';
import { ProjectAvatar } from '@/components/images';
import { Logo } from '@/components/logo';
import { MiniPlayer } from '@/components/mini-player';
import { useMe } from '@/lib/auth';
import { lastProject, rememberProject } from '@/lib/current-project';
import { useRoomy } from '@/lib/media';
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
// слева панель с проектами и разделами текущего проекта, её можно свернуть до значков.
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
        {/* плеер вне страницы: запись играет дальше при переходах */}
        <MiniPlayer />
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

const SIDEBAR_KEY = 'bounce.sidebar';

function readSidebarOpen(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== 'closed';
  } catch {
    return true;
  }
}

// Боковая панель (планшет и компьютер). На просторном экране стоит рядом со страницей:
// развёрнутая или свёрнутая до значков - как оставили. На экране поуже - всегда полоса значков,
// а развёрнутая ложится поверх страницы и закрывается нажатием мимо, Escape или переходом.
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
  const roomy = useRoomy();
  const [pinned, setPinned] = useState(readSidebarOpen);
  const [overlay, setOverlay] = useState(false);
  const wide = roomy ? pinned : overlay;
  const floating = !roomy && overlay;

  // переход или переход на просторный экран закрывает панель поверх страницы
  // biome-ignore lint/correctness/useExhaustiveDependencies: закрыть - именно при смене адреса
  useEffect(() => setOverlay(false), [pathname, roomy]);
  useEffect(() => {
    if (!floating) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOverlay(false);
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [floating]);

  function toggle() {
    if (!roomy) {
      setOverlay((o) => !o);
      return;
    }
    const next = !pinned;
    setPinned(next);
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? 'open' : 'closed');
    } catch {
      // без хранилища панель просто не запомнит выбор
    }
  }

  const item = cn(
    'flex min-h-9 items-center rounded-lg text-sm transition-colors',
    wide ? 'gap-2.5 px-2' : 'size-10 justify-center self-center',
  );
  const active = 'bg-groove font-medium text-ink';
  const idle = 'text-dim hover:bg-groove/60 hover:text-ink';
  // подпись пункта: в свёрнутой панели - только для экранного диктора и во всплывающей подсказке
  const label = (text: string) => (
    <span className={cn('truncate', !wide && 'sr-only')}>{text}</span>
  );
  const tip = (text: string) => (wide ? undefined : text);

  return (
    // место панели в строке: на экране поуже - всегда узкая полоса. Поверх страницы панель
    // поднимается вместе с этим местом: sticky - свой слой, z-index внутри него не помогает
    <div
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 transition-[width] duration-200 ease-out-soft md:block',
        roomy && pinned ? 'w-60' : 'w-16',
        floating && 'z-50',
      )}
    >
      {floating && (
        <button
          type="button"
          aria-label="Свернуть панель"
          tabIndex={-1}
          onClick={() => setOverlay(false)}
          className="fixed inset-0 cursor-default bg-black/20 animate-in fade-in-0"
        />
      )}
      <aside
        className={cn(
          'flex h-full flex-col gap-6 overflow-x-hidden overflow-y-auto border-r border-border/70 py-4 transition-[width] duration-200 ease-out-soft dark:border-border/50',
          wide ? 'w-60 px-3' : 'w-16 px-3',
          floating
            ? 'fixed top-0 left-0 h-dvh bg-console shadow-2xl'
            : 'bg-panel/50 dark:bg-black/10',
        )}
      >
        <div className={cn('flex items-center gap-1', wide ? 'justify-between' : 'flex-col gap-3')}>
          <Link
            to="/projects"
            title={tip('Bounce')}
            className={cn('flex items-center gap-2', wide && 'px-2')}
          >
            <Logo className="size-7" />
            {wide && <span className="font-semibold tracking-tight">Bounce</span>}
          </Link>
          <button
            type="button"
            onClick={toggle}
            aria-label={wide ? 'Свернуть панель' : 'Развернуть панель'}
            title={wide ? 'Свернуть панель' : 'Развернуть панель'}
            aria-expanded={wide}
            className="flex size-8 items-center justify-center rounded-lg text-dim transition-colors hover:bg-groove/60 hover:text-ink"
          >
            {wide ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
          </button>
        </div>

        <nav aria-label="Проекты" className="flex flex-col gap-1">
          {wide ? (
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
              className={cn(item, pathname === '/projects' ? active : idle)}
            >
              <FolderOpen className="size-4" strokeWidth={1.75} />
              <span className="sr-only">Проекты</span>
            </Link>
          )}
          {projects.data?.map((p) => {
            const current = p.id === projectId;
            return (
              <div key={p.id} className="flex flex-col">
                <Link
                  to="/p/$projectId"
                  params={{ projectId: p.id }}
                  title={tip(p.name)}
                  // открытый проект выделен только цветом текста, подсветка - у раздела под
                  // ним: ссылка проекта ведёт туда же, куда "Песни", и двойная подсветка путала
                  className={cn(item, current ? 'text-ink hover:bg-groove/60' : idle)}
                >
                  <ProjectAvatar project={p} className="size-7 rounded-md text-xs" />
                  {label(p.name)}
                </Link>
                {current && (
                  <ul className={cn('mt-0.5 mb-2 flex flex-col gap-0.5', wide && 'pl-4')}>
                    {SECTIONS.map((s) => (
                      <li key={s.id} className="flex flex-col">
                        <Link
                          {...sectionLink(s.id, p.id)}
                          aria-current={section === s.id ? 'page' : undefined}
                          title={tip(s.label)}
                          className={cn(item, section === s.id ? active : idle)}
                        >
                          <s.icon className="size-4 shrink-0" strokeWidth={1.75} />
                          {label(s.label)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {me?.canCreateProjects && (
            <Link
              to="/projects"
              search={{ create: true }}
              title={tip('Новый проект')}
              className={cn(item, idle)}
            >
              <Plus className="size-4 shrink-0" />
              {label('Новый проект')}
            </Link>
          )}
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          {me?.isAdmin && (
            <>
              <Link
                to="/admin/users"
                title={tip('Пользователи')}
                className={cn(item, pathname === '/admin/users' ? active : idle)}
              >
                <Users className="size-4 shrink-0" />
                {label('Пользователи')}
              </Link>
              <Link
                to="/admin/backup"
                title={tip('Резервная копия')}
                className={cn(item, pathname === '/admin/backup' ? active : idle)}
              >
                <DatabaseBackup className="size-4 shrink-0" />
                {label('Резервная копия')}
              </Link>
            </>
          )}
          <Link
            to="/me"
            title={tip(me?.name ?? 'Профиль')}
            className={cn(item, 'mt-2', pathname === '/me' ? active : idle)}
          >
            <Avatar user={me ?? undefined} className="size-7 shrink-0 text-xs" />
            {label(me?.name ?? '')}
          </Link>
        </div>
      </aside>
    </div>
  );
}
