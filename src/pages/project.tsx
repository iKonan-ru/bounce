import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useProjectCrumbs } from '@/components/crumbs';
import { ProjectAvatar, SongCover, useFieldUpload } from '@/components/images';
import { Meter } from '@/components/meter';
import { NewSongDialog } from '@/components/new-song-dialog';
import { EmptyState, GROUP_ROWS, PageHeader, Section } from '@/components/page';
import { SortableList } from '@/components/sortable';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/lib/auth';
import { dateLabel } from '@/lib/format';
import {
  SONG_STATUS_LABEL,
  SONG_STATUSES,
  type Song,
  type SongStatus,
  songStatus,
} from '@/lib/model';
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

const COLUMNS = 'md:grid md:grid-cols-[minmax(0,1fr)_7rem_10rem_9rem_6rem] md:gap-4';

// Строка песни: обложка, название, статус, текущий этап, прогресс и дата релиза.
function SongRow({ song: s, projectId }: { song: SongWithStages; projectId: string }) {
  const stages = stagesOf(s);
  const p = songProgress(stages);
  const now = currentStage(stages);
  const release = s.target_release ? dateLabel(s.target_release) : '';
  return (
    <Link
      to="/p/$projectId/songs/$songId"
      params={{ projectId, songId: s.id }}
      draggable={false}
      className={cn(
        'flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-groove/40 active:bg-groove/70 md:py-2.5',
        COLUMNS,
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <SongCover song={s} className="size-11 md:size-9" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{s.title}</span>
          <span className="block truncate text-sm text-dim md:hidden">
            {[SONG_STATUS_LABEL[songStatus(s)], now?.title].filter(Boolean).join(' · ')}
          </span>
        </span>
      </span>
      <span className="hidden truncate text-sm text-dim md:block">
        {SONG_STATUS_LABEL[songStatus(s)]}
      </span>
      <span className="hidden truncate text-sm text-dim md:block">{now?.title ?? ''}</span>
      {/* на телефоне справа: дата релиза над прогрессом; на компьютере дата - своей колонкой */}
      <span className="flex shrink-0 flex-col items-end gap-1 md:w-auto md:flex-row md:items-center md:gap-2">
        {stages.length > 0 ? (
          <>
            <span className="text-xs text-dim tabular-nums md:order-2 md:w-8 md:text-right">
              {release && <span className="md:hidden">{release} · </span>}
              {p.done}/{p.total}
            </span>
            <span className="w-16 md:order-1 md:w-auto md:flex-1">
              <Meter stages={stages} />
            </span>
          </>
        ) : (
          <span className="text-xs text-dim">
            {release && <span className="md:hidden">{release}</span>}
            <span className={cn(release && 'max-md:hidden')}>Нет этапов</span>
          </span>
        )}
      </span>
      <span className="hidden text-sm text-dim md:block">{release}</span>
      <ChevronRight className="size-4 shrink-0 text-dim/60 md:hidden" />
    </Link>
  );
}

export function ProjectPage() {
  const { projectId } = useParams({ from: '/app/p/$projectId/' });
  const project = useQuery(projectQuery(projectId));
  const songs = useQuery(songsQuery(projectId));
  const crumbs = useProjectCrumbs(projectId).slice(0, 1);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const me = useMe();
  const client = useQueryClient();
  // нажатие на пустой аватар проекта - загрузка картинки (только владелец)
  const avatar = useFieldUpload({
    record: project.data ?? { id: projectId, collectionId: '', collectionName: 'projects' },
    field: 'avatar',
    thumbs: ['256x256'],
    refresh: ['projects'],
  });

  const people = project.data
    ? [project.data.expand?.owner, ...(project.data.expand?.members ?? [])].filter(
        (u) => u !== undefined,
      )
    : [];
  const all = songs.data ?? [];
  const list = all.filter((s) => filter === 'all' || songStatus(s) === filter);
  // в работе - ручной порядок; отправленные и выпущенные - ниже, от новых к старым
  const main = list.filter((s) => !isOut(s)).sort(byPosition);
  const out = list.filter(isOut).sort(byRelease);

  // перетаскивание меняет порядок в общем списке песен в работе, даже если включён фильтр
  const reorder = (from: string, to: string) => {
    const ordered = arrayMoveById(all.filter((s) => !isOut(s)).sort(byPosition), from, to);
    const key = songsQuery(projectId).queryKey;
    const at = new Map(ordered.map((s, i) => [s.id, i]));
    client.setQueryData(key, (old) =>
      old?.map((s) => ({ ...s, position: at.get(s.id) ?? s.position })),
    );
    savePositions(pb, 'songs', ordered)
      .catch(() => toast.error('Порядок не сохранился: проверьте соединение'))
      .finally(() => client.invalidateQueries({ queryKey: ['songs'] }));
  };
  const count = (f: Filter) =>
    f === 'all' ? all.length : all.filter((s) => songStatus(s) === f).length;

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        media={
          project.data && (
            <ProjectAvatar
              project={project.data}
              interactive
              onPick={project.data.owner === me?.id ? avatar.pick : undefined}
              pending={avatar.pending}
              className="size-12 rounded-xl text-lg"
            />
          )
        }
        title={project.data?.name ?? ''}
        edit={{
          link: { to: '/p/$projectId/settings', params: { projectId } },
          label: 'Настройки проекта',
        }}
        meta={people.map((u) => u.name).join(', ')}
        actions={
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
        }
      />

      {songs.isPending && <Skeleton className="h-40 rounded-xl" />}
      {!songs.isPending && !songs.data && <p className="text-led-red">Песни не загрузились.</p>}
      {songs.data?.length === 0 && (
        <EmptyState
          action={
            <Button variant="secondary" onClick={() => setCreating(true)}>
              <Plus data-icon="inline-start" />
              Новая песня
            </Button>
          }
        >
          Песен пока нет
        </EmptyState>
      )}

      {all.length > 0 && (
        <>
          <div className="-mx-4 mb-3 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0 [scrollbar-width:none]">
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
          </div>

          {list.length === 0 && <EmptyState>Таких песен нет</EmptyState>}
          <div aria-hidden="true" className={cn('hidden py-2 pr-4 pl-8 text-xs text-dim', COLUMNS)}>
            <span>Песня</span>
            <span>Статус</span>
            <span>Сейчас</span>
            <span>Прогресс</span>
            <span>Релиз</span>
          </div>
          {main.length > 0 && (
            <SortableList items={main} onReorder={reorder} className={GROUP_ROWS} whole>
              {(s) => <SongRow song={s} projectId={projectId} />}
            </SortableList>
          )}
          {out.length > 0 && (
            <Section title="Отправлены на лейбл и выпущены" className="mt-8">
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
      <NewSongDialog projectId={projectId} open={creating} onOpenChange={setCreating} />
    </>
  );
}
