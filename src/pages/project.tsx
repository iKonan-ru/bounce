import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useProjectCrumbs } from '@/components/crumbs';
import { ProjectAvatar, SongCover } from '@/components/images';
import { Meter } from '@/components/meter';
import { NewSongDialog } from '@/components/new-song-dialog';
import { NotesFeed } from '@/components/notes';
import { Columns, PageHeader, SectionTitle } from '@/components/page';
import { Segmented } from '@/components/segmented';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWide } from '@/lib/media';
import { SONG_STATUS_LABEL, SONG_STATUSES, type SongStatus } from '@/lib/model';
import { currentStage, songProgress } from '@/lib/progress';
import { projectQuery, songsQuery, stagesOf } from '@/lib/queries';
import { cn } from '@/lib/utils';

export function ProjectPage() {
  const { projectId } = useParams({ from: '/app/p/$projectId/' });
  const { tab } = useSearch({ from: '/app/p/$projectId/' });
  const navigate = useNavigate();
  const wide = useWide();
  const project = useQuery(projectQuery(projectId));
  const crumbs = useProjectCrumbs(projectId).slice(0, 1);
  const [creating, setCreating] = useState(false);

  const people = project.data
    ? [project.data.expand?.owner, ...(project.data.expand?.members ?? [])].filter(
        (u) => u !== undefined,
      )
    : [];

  const songs = <SongList projectId={projectId} />;
  const notes = <NotesFeed scope={{ project: projectId }} />;

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        media={
          project.data && (
            <ProjectAvatar project={project.data} className="size-14 rounded-xl text-xl" />
          )
        }
        title={project.data?.name ?? ''}
        meta={<p className="text-sm text-dim">{people.map((u) => u.name).join(', ')}</p>}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus data-icon="inline-start" />
            Новая песня
          </Button>
        }
      />
      {wide ? (
        <Columns
          main={
            <>
              <SectionTitle>Песни</SectionTitle>
              {songs}
            </>
          }
          side={
            <>
              <SectionTitle>Заметки проекта</SectionTitle>
              {notes}
            </>
          }
        />
      ) : (
        <>
          <Segmented
            label="Раздел проекта"
            className="mb-4"
            options={[
              { value: 'songs', label: 'Песни' },
              { value: 'notes', label: 'Заметки проекта' },
            ]}
            value={tab ?? 'songs'}
            onChange={(v) =>
              void navigate({
                to: '/p/$projectId',
                params: { projectId },
                search: v === 'notes' ? { tab: 'notes' } : {},
                replace: true,
              })
            }
          />
          {tab === 'notes' ? notes : songs}
        </>
      )}
      <NewSongDialog projectId={projectId} open={creating} onOpenChange={setCreating} />
    </>
  );
}

type Filter = SongStatus | 'all';

function SongList({ projectId }: { projectId: string }) {
  const songs = useQuery(songsQuery(projectId));
  const [filter, setFilter] = useState<Filter>('all');
  const list = (songs.data ?? []).filter((s) => filter === 'all' || s.status === filter);

  if (songs.isPending) return <Skeleton className="h-24 rounded-xl" />;
  if (!songs.data) return <p className="text-led-red">Песни не загрузились.</p>;
  if (songs.data.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-dim">Песен пока нет</p>
    );
  }

  const counts = (st: SongStatus) => songs.data.filter((s) => s.status === st).length;

  return (
    <>
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {(['all', ...SONG_STATUSES] as const).map((f) => {
          const n = f === 'all' ? songs.data.length : counts(f);
          if (f !== 'all' && n === 0) return null;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors',
                filter === f ? 'border-ink/30 bg-groove text-ink' : 'text-dim hover:text-ink',
              )}
            >
              {f === 'all' ? 'Все' : SONG_STATUS_LABEL[f]}
              <span className="text-xs text-dim">{n}</span>
            </button>
          );
        })}
      </div>
      <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {list.map((s) => {
          const stages = stagesOf(s);
          const p = songProgress(stages);
          const now = currentStage(stages);
          return (
            <li key={s.id}>
              <Link
                to="/p/$projectId/songs/$songId"
                params={{ projectId, songId: s.id }}
                className="flex items-center gap-3 rounded-xl bg-panel p-3 transition-colors hover:bg-groove/50 active:bg-groove"
              >
                <SongCover song={s} />
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium">{s.title}</span>
                    {stages.length > 0 && (
                      <span className="shrink-0 text-xs text-dim">
                        {p.done}/{p.total}
                      </span>
                    )}
                  </span>
                  {stages.length > 0 && <Meter stages={stages} />}
                  <span className="truncate text-xs text-dim">
                    {SONG_STATUS_LABEL[s.status]}
                    {now && s.status === 'active' ? ` · ${now.title}` : ''}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
