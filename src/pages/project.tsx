import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useProjectCrumbs } from '@/components/crumbs';
import { ProjectAvatar, SongCover } from '@/components/images';
import { Meter } from '@/components/meter';
import { NewSongDialog } from '@/components/new-song-dialog';
import { EmptyState, GROUP_ROWS, PageHeader } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/lib/auth';
import { dateLabel } from '@/lib/format';
import {
  MAX_IMAGE_BYTES,
  SONG_STATUS_LABEL,
  SONG_STATUSES,
  type SongStatus,
  songStatus,
} from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { currentStage, songProgress } from '@/lib/progress';
import { projectQuery, songsQuery, stagesOf } from '@/lib/queries';
import { cn } from '@/lib/utils';

type Filter = SongStatus | 'all';

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
  const avatar = useMutation({
    mutationFn: (file: File) => {
      if (file.size > MAX_IMAGE_BYTES) throw new Error('большой файл');
      const form = new FormData();
      form.set('avatar', file);
      return collection(pb, 'projects').update(projectId, form);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['projects'] }),
    onError: () => toast.error('Картинка не загрузилась: проверьте соединение и размер файла'),
  });

  const people = project.data
    ? [project.data.expand?.owner, ...(project.data.expand?.members ?? [])].filter(
        (u) => u !== undefined,
      )
    : [];
  const all = songs.data ?? [];
  const list = all.filter((s) => filter === 'all' || songStatus(s) === filter);
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
              onPick={project.data.owner === me?.id ? (f) => avatar.mutate(f) : undefined}
              className="size-12 rounded-xl text-lg"
            />
          )
        }
        title={project.data?.name ?? ''}
        meta={people.map((u) => u.name).join(', ')}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus data-icon="inline-start" />
            <span className="max-sm:sr-only">Новая песня</span>
          </Button>
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

          <div className={GROUP_ROWS}>
            <div className="hidden grid-cols-[minmax(0,1fr)_7rem_10rem_9rem_6rem] items-center gap-4 px-4 py-2 text-xs text-dim md:grid">
              <span>Песня</span>
              <span>Статус</span>
              <span>Сейчас</span>
              <span>Прогресс</span>
              <span>Релиз</span>
            </div>
            {list.map((s) => {
              const stages = stagesOf(s);
              const p = songProgress(stages);
              const now = currentStage(stages);
              return (
                <Link
                  key={s.id}
                  to="/p/$projectId/songs/$songId"
                  params={{ projectId, songId: s.id }}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-groove/40 active:bg-groove/70 md:grid md:grid-cols-[minmax(0,1fr)_7rem_10rem_9rem_6rem] md:gap-4 md:py-2.5"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <SongCover song={s} className="size-11 md:size-9" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{s.title}</span>
                      <span className="block truncate text-sm text-dim md:hidden">
                        {SONG_STATUS_LABEL[songStatus(s)]}
                        {now ? ` · ${now.title}` : ''}
                      </span>
                    </span>
                  </span>
                  <span className="hidden truncate text-sm text-dim md:block">
                    {SONG_STATUS_LABEL[songStatus(s)]}
                  </span>
                  <span className="hidden truncate text-sm text-dim md:block">
                    {now?.title ?? ''}
                  </span>
                  <span className="flex w-16 shrink-0 flex-col items-end gap-1 md:w-auto md:flex-row md:items-center md:gap-2">
                    {stages.length > 0 ? (
                      <>
                        <span className="text-xs text-dim tabular-nums md:order-2 md:w-8 md:text-right">
                          {p.done}/{p.total}
                        </span>
                        <span className="w-full md:order-1 md:flex-1">
                          <Meter stages={stages} />
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-dim">Нет этапов</span>
                    )}
                  </span>
                  <span className="hidden text-sm text-dim md:block">
                    {s.target_release ? dateLabel(s.target_release) : ''}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-dim/60 md:hidden" />
                </Link>
              );
            })}
          </div>
        </>
      )}
      <NewSongDialog projectId={projectId} open={creating} onOpenChange={setCreating} />
    </>
  );
}
