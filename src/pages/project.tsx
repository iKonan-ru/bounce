import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowUpDown, Check, ChevronRight, GripVertical, Plus } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ProjectAvatar, SongCover, useFieldUpload } from '@/components/images';
import { Loading } from '@/components/loading';
import { Meter } from '@/components/meter';
import { NewSongDialog } from '@/components/new-song-dialog';
import { EmptyState, GROUP_ROWS, PageHeader, Section } from '@/components/page';
import { AvatarStack } from '@/components/people-picker';
import { ProjectLinksBar, projectLinks } from '@/components/project-links';
import { SortableList } from '@/components/sortable';
import { Button } from '@/components/ui/button';
import { useAccess } from '@/lib/access';
import { dateLabel } from '@/lib/format';
import {
  projectPeople,
  SONG_STATUS_LABEL,
  SONG_STATUSES,
  type Song,
  type SongStatus,
  songStatus,
} from '@/lib/model';
import { optimisticEdit } from '@/lib/optimistic';
import { pb } from '@/lib/pb';
import { currentStage, songProgress } from '@/lib/progress';
import { projectQuery, type SongWithStages, songsQuery, stagesOf } from '@/lib/queries';
import { arrayMoveById, savePositions } from '@/lib/stages';
import { cn } from '@/lib/utils';

type Filter = SongStatus | 'all';

const isOut = (s: Song) => {
  const st = songStatus(s);
  return st === 'sent' || st === 'released';
};
const byPosition = (a: Song, b: Song) =>
  (a.position ?? 0) - (b.position ?? 0) || b.created.localeCompare(a.created);
const releaseKey = (s: Song) => s.target_release || s.created;
const byRelease = (a: Song, b: Song) => releaseKey(b).localeCompare(releaseKey(a));

// Таблица - на широком экране; песня - вся свободная ширина, под названием - текущий этап.
const COLUMNS = 'lg:grid lg:grid-cols-[minmax(0,1fr)_11rem_10rem_6rem] lg:gap-6';

// Строка песни: обложка, название, статус, текущий этап, прогресс и дата релиза.
// В режиме порядка строка - не ссылка: её тянут за любое место, слева - значок захвата.
function SongRow({
  song: s,
  projectId,
  ordering = false,
}: {
  song: SongWithStages;
  projectId: string;
  ordering?: boolean;
}) {
  const stages = stagesOf(s);
  const p = songProgress(stages);
  const now = currentStage(stages);
  const release = s.target_release ? dateLabel(s.target_release) : '';
  const status = SONG_STATUS_LABEL[songStatus(s)];
  const body = (
    <>
      <span className="flex min-w-0 flex-1 items-center gap-3">
        {ordering && (
          <GripVertical className="-mr-1 -ml-1 size-4 shrink-0 text-dim animate-in fade-in-0 zoom-in-75" />
        )}
        <SongCover song={s} className="size-11 lg:size-10" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{s.title}</span>
          <span className="block truncate text-sm text-dim lg:hidden">
            {[status, now?.title].filter(Boolean).join(' · ')}
          </span>
          {now && <span className="hidden truncate text-sm text-dim lg:block">{now.title}</span>}
        </span>
      </span>
      <span className="hidden truncate text-sm text-dim lg:block">{status}</span>
      {/* справа: на телефоне и планшете - дата релиза над прогрессом; на компьютере дата - колонкой */}
      <span className="flex shrink-0 flex-col items-end gap-1 lg:w-auto lg:flex-row lg:items-center lg:gap-2">
        {stages.length > 0 ? (
          <>
            <span className="text-xs text-dim tabular-nums lg:order-2 lg:w-8 lg:text-right">
              {release && <span className="lg:hidden">{release} · </span>}
              {p.done}/{p.total}
            </span>
            <span className="w-16 lg:order-1 lg:w-auto lg:flex-1">
              <Meter stages={stages} />
            </span>
          </>
        ) : (
          <span className="text-xs text-dim">
            {release && <span className="lg:hidden">{release}</span>}
            <span className={cn(release && 'max-lg:hidden')}>Нет этапов</span>
          </span>
        )}
      </span>
      <span className="hidden text-sm text-dim lg:block">{release}</span>
      {!ordering && <ChevronRight className="size-4 shrink-0 text-dim/60 lg:hidden" />}
    </>
  );
  const row = cn('flex min-w-0 items-center gap-3 px-4 py-3 transition-colors lg:py-2.5', COLUMNS);
  if (ordering) {
    return (
      <div className={cn(row, 'cursor-grab hover:bg-groove/40 active:cursor-grabbing')}>{body}</div>
    );
  }
  return (
    <Link
      to="/p/$projectId/songs/$songId"
      params={{ projectId, songId: s.id }}
      draggable={false}
      className={cn(row, 'hover:bg-groove/40 active:bg-groove/70')}
    >
      {body}
    </Link>
  );
}

export function ProjectPage() {
  const { projectId } = useParams({ from: '/app/p/$projectId/' });
  const project = useQuery(projectQuery(projectId));
  const songs = useQuery(songsQuery(projectId));
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const access = useAccess(projectId);
  const client = useQueryClient();
  // нажатие на пустой аватар проекта - загрузка картинки (только владелец)
  const avatar = useFieldUpload({
    record: project.data ?? { id: projectId, collectionId: '', collectionName: 'projects' },
    field: 'avatar',
    thumbs: ['256x256'],
    refresh: ['projects'],
  });

  const people = project.data ? projectPeople(project.data).map((x) => x.user) : [];
  const all = songs.data ?? [];
  const list = all.filter((s) => filter === 'all' || songStatus(s) === filter);
  const working = all.filter((s) => !isOut(s)).sort(byPosition);

  // Режим порядка: песни в работе переставляются перетаскиванием, порядок применяется кнопкой
  // "Готово", нажатием вне списка, Escape или уходом со страницы.
  const [ordering, setOrdering] = useState<SongWithStages[] | null>(null);
  const orderingRef = useRef(ordering);
  orderingRef.current = ordering;
  const listRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const apply = useCallback(() => {
    const ordered = orderingRef.current;
    setOrdering(null);
    if (!ordered || ordered.every((s, i) => (s.position ?? 0) === i)) return;
    const at = new Map(ordered.map((s, i) => [s.id, i]));
    void optimisticEdit(
      client,
      'songs',
      () =>
        client.setQueryData(songsQuery(projectId).queryKey, (old) =>
          old?.map((s) => ({ ...s, position: at.get(s.id) ?? s.position })),
        ),
      () => savePositions(pb, 'songs', ordered),
    ).catch(() => toast.error('Порядок не сохранился: проверьте соединение'));
  }, [client, projectId]);
  const startOrdering = () => {
    setFilter('all');
    setOrdering(working);
  };
  const active = ordering !== null;
  useEffect(() => {
    if (!active) return;
    const outside = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (listRef.current?.contains(t) || toggleRef.current?.contains(t)) return;
      apply();
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && apply();
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
    };
  }, [active, apply]);
  // ушли со страницы, не нажав "Готово" - порядок всё равно сохраняется
  useEffect(() => () => apply(), [apply]);

  // в работе - ручной порядок; отправленные и выпущенные - ниже, от новых к старым
  const main = ordering ?? list.filter((s) => !isOut(s)).sort(byPosition);
  const out = list.filter(isOut).sort(byRelease);
  const reorder = (from: string, to: string) =>
    setOrdering((cur) => (cur ? arrayMoveById(cur, from, to) : cur));
  const count = (f: Filter) =>
    f === 'all' ? all.length : all.filter((s) => songStatus(s) === f).length;

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Проекты', link: { to: '/projects' } }]}
        media={
          project.data && (
            <ProjectAvatar
              project={project.data}
              interactive
              onPick={access.manage ? avatar.pick : undefined}
              pending={avatar.pending}
              className="size-12 rounded-xl text-lg"
            />
          )
        }
        title={project.data?.name ?? ''}
        {...(access.edit
          ? {
              edit: {
                link: { to: '/p/$projectId/settings', params: { projectId } },
                label: 'Настройки проекта',
              },
            }
          : {})}
        meta={
          people.length > 0 && (
            <AvatarStack users={people} max={6} ring="ring-console" className="mt-1" />
          )
        }
        actions={
          access.edit && (
            <>
              <Button
                size="icon"
                aria-label="Новая песня"
                className="sm:hidden"
                onClick={() => setCreating(true)}
              >
                <Plus className="size-5" />
              </Button>
              <Button className="max-sm:hidden" onClick={() => setCreating(true)}>
                <Plus data-icon="inline-start" />
                Новая песня
              </Button>
            </>
          )
        }
      />

      {songs.isPending && <Loading className="h-40 rounded-xl" />}
      {!songs.isPending && !songs.data && <p className="text-led-red">Песни не загрузились.</p>}
      {songs.data?.length === 0 && (
        <EmptyState
          action={
            access.edit && (
              <Button variant="secondary" onClick={() => setCreating(true)}>
                <Plus data-icon="inline-start" />
                Новая песня
              </Button>
            )
          }
        >
          Песен пока нет
        </EmptyState>
      )}

      {all.length > 0 && (
        <>
          <div className="mb-3 flex items-center gap-2">
            <FadeScroller
              className={cn('transition-opacity', ordering && 'pointer-events-none opacity-40')}
            >
              {(['all', ...SONG_STATUSES] as const).map((f) => {
                const n = count(f);
                if (f !== 'all' && n === 0) return null;
                return (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={filter === f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors',
                      filter === f
                        ? 'bg-groove font-medium text-ink'
                        : 'text-dim hover:bg-groove/50 hover:text-ink',
                    )}
                  >
                    {f === 'all' ? 'Все' : SONG_STATUS_LABEL[f]}
                    <span className="text-xs text-dim tabular-nums">{n}</span>
                  </button>
                );
              })}
            </FadeScroller>
            {access.edit && working.length > 1 && (
              <Button
                ref={toggleRef}
                size="sm"
                variant={ordering ? 'default' : 'ghost'}
                aria-pressed={ordering !== null}
                aria-label={ordering ? 'Готово' : 'Порядок'}
                title={ordering ? 'Готово' : 'Порядок'}
                // на телефоне - только значок: место в строке остаётся статусам
                className={cn(
                  'h-8 shrink-0 gap-1.5 max-sm:w-8 max-sm:px-0 sm:px-2.5',
                  !ordering && 'text-dim',
                )}
                onClick={() => (ordering ? apply() : startOrdering())}
              >
                {ordering ? <Check /> : <ArrowUpDown />}
                <span className="max-sm:hidden">{ordering ? 'Готово' : 'Порядок'}</span>
              </Button>
            )}
          </div>

          {list.length === 0 && <EmptyState>Таких песен нет</EmptyState>}
          <div aria-hidden="true" className={cn('hidden px-4 py-2 text-xs text-dim', COLUMNS)}>
            <span>Песня</span>
            <span>Статус</span>
            <span>Прогресс</span>
            <span>Релиз</span>
          </div>
          {main.length > 0 && (
            <div ref={listRef}>
              {ordering ? (
                <SortableList
                  items={main}
                  onReorder={reorder}
                  className={cn(GROUP_ROWS, 'ring-2 ring-ring/40 dark:ring-ring/50')}
                  whole
                  pressDelay={150}
                >
                  {(s) => <SongRow song={s} projectId={projectId} ordering />}
                </SortableList>
              ) : (
                <ul className={GROUP_ROWS}>
                  {main.map((s) => (
                    <li key={s.id}>
                      <SongRow song={s} projectId={projectId} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {out.length > 0 && (
            <Section
              title="Отправлены на лейбл и выпущены"
              className={cn(
                'mt-8 transition-opacity',
                ordering && 'pointer-events-none opacity-40',
              )}
            >
              <ul className={GROUP_ROWS}>
                {out.map((s) => (
                  <li key={s.id}>
                    <SongRow song={s} projectId={projectId} />
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}
      {project.data && projectLinks(project.data).length > 0 && (
        <Section
          title="Ссылки"
          // прижаты к низу страницы: короткий список песен их не поднимает
          className={cn(
            'mt-auto pt-10 transition-opacity',
            ordering && 'pointer-events-none opacity-40',
          )}
        >
          <ProjectLinksBar project={project.data} />
        </Section>
      )}
      <NewSongDialog projectId={projectId} open={creating} onOpenChange={setCreating} />
    </>
  );
}

// Полоса, которая прокручивается вбок; край, за которым есть ещё, уходит под градиент цвета
// страницы.
function FadeScroller({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdges((e) => (e.left === left && e.right === right ? e : { left, right }));
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [measure]);
  const fade =
    'pointer-events-none absolute inset-y-0 w-10 from-console to-transparent transition-opacity';
  return (
    <div className={cn('relative -ml-4 min-w-0 flex-1 md:ml-0', className)}>
      <div
        ref={ref}
        onScroll={measure}
        className="flex gap-1 overflow-x-auto pl-4 md:pl-0 [scrollbar-width:none]"
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className={cn(fade, 'left-0 bg-linear-to-r', !edges.left && 'opacity-0')}
      />
      <div
        aria-hidden="true"
        className={cn(fade, 'right-0 bg-linear-to-l', !edges.right && 'opacity-0')}
      />
    </div>
  );
}
