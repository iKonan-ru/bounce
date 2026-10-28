import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { BackLink } from '@/components/back-link';
import { Meter } from '@/components/meter';
import { NotesFeed } from '@/components/notes-feed';
import { StageDrawer } from '@/components/stage-drawer';
import { LED_CLASS, TEXT_CLASS } from '@/components/status';
import { Skeleton } from '@/components/ui/skeleton';
import { SONG_STATUS_LABEL, STAGE_STATUS_LABEL } from '@/lib/model';
import { songProgress } from '@/lib/progress';
import { songQuery, stagesOf } from '@/lib/queries';
import { cn } from '@/lib/utils';

export function SongPage() {
  const { projectId, songId } = useParams({ from: '/app/p/$projectId/songs/$songId' });
  const song = useQuery(songQuery(songId));
  const [openStageId, setOpenStageId] = useState<string>();

  const stages = song.data ? stagesOf(song.data) : [];
  const p = songProgress(stages);

  return (
    <section>
      <BackLink to="/p/$projectId/songs" params={{ projectId }}>
        Песни
      </BackLink>

      {song.isPending && <Skeleton className="h-40 rounded-xl" />}
      {song.isError && <p className="text-led-red">Песня не найдена или нет соединения.</p>}

      {song.data && (
        <>
          <header>
            <h1 className="text-3xl font-semibold tracking-tight text-balance">
              {song.data.title}
            </h1>
            <dl className="mt-3 flex flex-wrap gap-2 text-sm">
              <div className="rounded-md bg-panel px-2 py-1">
                <dt className="sr-only">Статус</dt>
                <dd>{SONG_STATUS_LABEL[song.data.status]}</dd>
              </div>
              {song.data.bpm > 0 && (
                <div className="rounded-md bg-panel px-2 py-1">
                  <dt className="sr-only">Темп</dt>
                  <dd>{song.data.bpm} BPM</dd>
                </div>
              )}
              {song.data.key && (
                <div className="rounded-md bg-panel px-2 py-1">
                  <dt className="sr-only">Тональность</dt>
                  <dd>{song.data.key}</dd>
                </div>
              )}
            </dl>
          </header>

          <div className="mt-6 rounded-xl bg-panel p-4">
            <Meter stages={stages} size="lg" />
            <p className="mt-3 text-sm text-dim">
              Готово {p.done} из {p.total}
            </p>
          </div>

          <ol className="mt-6 flex flex-col">
            {stages.map((s) => {
              const sub = s.substeps ?? [];
              return (
                <li key={s.id} className="border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpenStageId(s.id)}
                    className="flex w-full items-center gap-3 py-3.5 text-left active:bg-panel"
                  >
                    <span className={cn('size-2.5 shrink-0 rounded-full', LED_CLASS[s.status])} />
                    <span className="w-5 shrink-0 text-sm text-dim">{s.position + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block text-pretty',
                          s.status === 'skipped' && 'text-dim line-through',
                        )}
                      >
                        {s.title}
                      </span>
                      {(sub.length > 0 || s.note) && (
                        <span className="block truncate text-xs text-dim">
                          {sub.length > 0
                            ? `${sub.filter((x) => x.done).length} из ${sub.length} подэтапов`
                            : s.note}
                        </span>
                      )}
                    </span>
                    <span className={cn('shrink-0 text-xs', TEXT_CLASS[s.status])}>
                      {STAGE_STATUS_LABEL[s.status]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Идеи и комментарии</h2>
            <NotesFeed
              scope={{ project: projectId, song: songId }}
              empty="Здесь копятся идеи и комментарии по песне: текстом, с аудио и фото."
            />
          </section>

          <StageDrawer
            projectId={projectId}
            songId={songId}
            stage={stages.find((s) => s.id === openStageId)}
            onOpenChange={(open) => !open && setOpenStageId(undefined)}
          />
        </>
      )}
    </section>
  );
}
