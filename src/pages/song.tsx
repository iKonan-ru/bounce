import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { ChevronRight, FileText, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { AddInline } from '@/components/add-inline';
import { useProjectCrumbs } from '@/components/crumbs';
import { SongCover } from '@/components/images';
import { Meter } from '@/components/meter';
import { NotesFeed } from '@/components/notes';
import { Columns, PageHeader, SectionTitle } from '@/components/page';
import { Segmented } from '@/components/segmented';
import { SortableList } from '@/components/sortable';
import { LED_CLASS, TEXT_CLASS } from '@/components/status';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { dateLabel, isOverdue } from '@/lib/format';
import { useWide } from '@/lib/media';
import { SONG_STATUS_LABEL, type SongStage, STAGE_STATUS_LABEL } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { songProgress } from '@/lib/progress';
import { songQuery, stagesOf } from '@/lib/queries';
import { arrayMoveById, nextPosition, reorderStages } from '@/lib/stages';
import { cn } from '@/lib/utils';

export function SongPage() {
  const { projectId, songId } = useParams({ from: '/app/p/$projectId/songs/$songId' });
  const { tab } = useSearch({ from: '/app/p/$projectId/songs/$songId' });
  const navigate = useNavigate();
  const wide = useWide();
  const song = useQuery(songQuery(songId));
  const crumbs = useProjectCrumbs(projectId);

  if (song.isPending) return <Skeleton className="h-40 rounded-xl" />;
  if (song.isError) return <p className="text-led-red">Песня не найдена или нет соединения.</p>;

  const s = song.data;
  const chips = [
    SONG_STATUS_LABEL[s.status],
    s.bpm ? `${s.bpm} BPM` : '',
    s.key ?? '',
    s.target_release ? `Релиз ${dateLabel(s.target_release)}` : '',
  ].filter(Boolean);

  const stages = (
    <Stages projectId={projectId} songId={songId} stages={stagesOf(s)} titled={wide} />
  );
  const notes = <NotesFeed scope={{ project: projectId, song: songId }} />;

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        media={<SongCover song={s} size="lg" />}
        title={s.title}
        meta={
          <div className="flex flex-col gap-3">
            <ul className="flex flex-wrap gap-2 text-sm">
              {chips.map((c) => (
                <li key={c} className="rounded-md bg-panel px-2 py-1">
                  {c}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" asChild>
                <Link to="/p/$projectId/songs/$songId/lyrics" params={{ projectId, songId }}>
                  <FileText data-icon="inline-start" />
                  Текст песни
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/p/$projectId/songs/$songId/edit" params={{ projectId, songId }}>
                  <Settings2 data-icon="inline-start" />
                  Настройки песни
                </Link>
              </Button>
            </div>
          </div>
        }
      />
      {wide ? (
        <Columns
          main={stages}
          side={
            <>
              <SectionTitle>Заметки песни</SectionTitle>
              {notes}
            </>
          }
        />
      ) : (
        <>
          <Segmented
            label="Раздел песни"
            className="mb-4"
            options={[
              { value: 'stages', label: 'Этапы' },
              { value: 'notes', label: 'Заметки' },
            ]}
            value={tab ?? 'stages'}
            onChange={(v) =>
              void navigate({
                to: '/p/$projectId/songs/$songId',
                params: { projectId, songId },
                search: v === 'notes' ? { tab: 'notes' } : {},
                replace: true,
              })
            }
          />
          {tab === 'notes' ? notes : stages}
        </>
      )}
    </>
  );
}

function Stages({
  projectId,
  songId,
  stages,
  titled,
}: {
  projectId: string;
  songId: string;
  stages: SongStage[];
  titled: boolean;
}) {
  const client = useQueryClient();
  const p = songProgress(stages);

  const add = useMutation({
    mutationFn: (title: string) =>
      collection(pb, 'song_stages').create({
        song: songId,
        title,
        position: nextPosition(stages),
        status: 'not_started',
        substeps: [],
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['songs'] }),
    onError: () => toast.error('Этап не добавлен: проверьте соединение'),
  });

  const reorder = (from: string, to: string) =>
    void reorderStages(client, songId, arrayMoveById(stages, from, to)).catch(() =>
      toast.error('Порядок не сохранился: проверьте соединение'),
    );

  return (
    <section>
      {titled && <SectionTitle>Этапы</SectionTitle>}
      {stages.length > 0 && (
        <div className="mb-4 rounded-xl bg-panel p-4">
          <Meter stages={stages} size="lg" />
          <p className="mt-3 text-sm text-dim">
            Готово {p.done} из {p.total}
          </p>
        </div>
      )}
      <SortableList items={stages} onReorder={reorder} className="mb-3 flex flex-col">
        {(s, handle, i) => {
          const sub = s.substeps ?? [];
          const late =
            s.deadline && s.status !== 'done' && s.status !== 'skipped' && isOverdue(s.deadline);
          const details = [
            sub.length > 0 ? `${sub.filter((x) => x.done).length} из ${sub.length}` : '',
            s.deadline ? `до ${dateLabel(s.deadline)}` : '',
          ].filter(Boolean);
          return (
            <div className="flex items-center gap-1 border-b">
              {handle}
              <Link
                to="/p/$projectId/songs/$songId/stages/$stageId"
                params={{ projectId, songId, stageId: s.id }}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-3.5 pr-2 transition-colors hover:bg-panel/70"
              >
                <span className={cn('size-2.5 shrink-0 rounded-full', LED_CLASS[s.status])} />
                <span className="w-5 shrink-0 text-sm text-dim">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-pretty',
                      s.status === 'skipped' && 'text-dim line-through',
                    )}
                  >
                    {s.title}
                  </span>
                  {details.length > 0 && (
                    <span
                      className={cn('block truncate text-xs', late ? 'text-led-red' : 'text-dim')}
                    >
                      {details.join(' · ')}
                    </span>
                  )}
                </span>
                <span className={cn('shrink-0 text-xs', TEXT_CLASS[s.status])}>
                  {STAGE_STATUS_LABEL[s.status]}
                </span>
                <ChevronRight className="size-4 shrink-0 text-dim" />
              </Link>
            </div>
          );
        }}
      </SortableList>
      <AddInline
        id="new-stage"
        placeholder="Новый этап"
        busy={add.isPending}
        onAdd={(t) => add.mutateAsync(t)}
      />
    </section>
  );
}
