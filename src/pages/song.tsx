import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ChevronRight, ExternalLink, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { AddRow } from '@/components/add-inline';
import { useProjectCrumbs } from '@/components/crumbs';
import { SongCover, useFileUrl, useImageUpload } from '@/components/images';
import { Meter } from '@/components/meter';
import { NotesFeed } from '@/components/notes';
import { Columns, GROUP_ROWS, PageHeader, Section } from '@/components/page';
import { AvatarStack } from '@/components/people-picker';
import { SongPosts } from '@/components/posts';
import { ReleaseSection } from '@/components/release-section';
import { SortableList } from '@/components/sortable';
import { StatusDot } from '@/components/stage-status';
import { TEXT_CLASS } from '@/components/status';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccess } from '@/lib/access';
import { useMe } from '@/lib/auth';
import { dateLabel, isOverdue } from '@/lib/format';
import { warmImages } from '@/lib/images';
import {
  projectPeople,
  SONG_STATUS_LABEL,
  type Song,
  type SongStage,
  STAGE_STATUS_LABEL,
  songStatus,
} from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { songProgress } from '@/lib/progress';
import { projectQuery, songQuery, stagesOf } from '@/lib/queries';
import { arrayMoveById, nextPosition, reorderStages } from '@/lib/stages';
import { sendRecordForm } from '@/lib/upload';
import { cn } from '@/lib/utils';

export function SongPage() {
  const { projectId, songId } = useParams({ from: '/app/p/$projectId/songs/$songId' });
  const song = useQuery(songQuery(songId));
  const crumbs = useProjectCrumbs(projectId);
  const access = useAccess(projectId);
  const me = useMe();
  const client = useQueryClient();
  const fileUrl = useFileUrl();
  // нажатие на пустую обложку в шапке - загрузка первой обложки
  const cover = useImageUpload(async (file, onProgress) => {
    const form = new FormData();
    form.append('covers+', file);
    const next = await sendRecordForm<Song>('songs', form, { id: songId, onProgress });
    const added = next.covers.at(-1);
    await warmImages([fileUrl(next, added, '600x600'), fileUrl(next, added, '96x96')]);
    await client.invalidateQueries({ queryKey: ['songs'] });
  }, 'Обложка не загрузилась: проверьте соединение');

  if (song.isPending) return <Skeleton className="h-40 rounded-xl" />;
  if (!song.data) return <p className="text-led-red">Песня не найдена или нет соединения.</p>;

  const s = song.data;
  const facts = [
    SONG_STATUS_LABEL[songStatus(s)],
    s.bpm ? `${s.bpm} BPM` : '',
    s.key ?? '',
    s.target_release ? `релиз ${dateLabel(s.target_release)}` : '',
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        media={
          <SongCover song={s} size="lg" interactive onPick={cover.pick} pending={cover.pending} />
        }
        title={s.title}
        {...(access.edit
          ? {
              edit: {
                link: { to: '/p/$projectId/songs/$songId/edit', params: { projectId, songId } },
                label: 'Настройки песни',
              },
            }
          : {})}
        meta={facts.join(' · ')}
        below={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" className="h-9 px-3 max-sm:flex-1" asChild>
              <Link to="/p/$projectId/songs/$songId/lyrics" params={{ projectId, songId }}>
                <FileText data-icon="inline-start" />
                Текст песни
              </Link>
            </Button>
            {s.bandlink && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-dim max-sm:flex-1 max-sm:bg-panel"
                asChild
              >
                <a href={s.bandlink} target="_blank" rel="noreferrer">
                  <ExternalLink data-icon="inline-start" />
                  Bandlink
                </a>
              </Button>
            )}
          </div>
        }
      />
      <Columns
        main={
          <div className="flex flex-col gap-8">
            <Stages
              projectId={projectId}
              songId={songId}
              stages={stagesOf(s)}
              editable={access.edit}
            />
            <ReleaseSection projectId={projectId} song={s} editable={access.edit} />
            <SongPosts song={s} meId={me?.id} canWork={access.work} />
          </div>
        }
        side={
          <Section title="Заметки">
            <NotesFeed scope={{ project: projectId, song: songId }} />
          </Section>
        }
      />
    </>
  );
}

function Stages({
  projectId,
  songId,
  stages,
  editable,
}: {
  projectId: string;
  songId: string;
  stages: SongStage[];
  // состав и порядок этапов - редакторы; остальные только открывают этап
  editable: boolean;
}) {
  const project = useQuery(projectQuery(projectId));
  const people = new Map(
    project.data ? projectPeople(project.data).map((p) => [p.user.id, p.user] as const) : [],
  );
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
    <Section
      title="Этапы"
      action={
        stages.length > 0 && (
          <span className="text-sm text-dim tabular-nums">
            {p.done} из {p.total}
          </span>
        )
      }
    >
      <div className={GROUP_ROWS}>
        {stages.length > 0 && (
          <div className="px-4 py-3.5">
            <Meter stages={stages} size="lg" />
          </div>
        )}
        {stages.length > 0 && (
          <SortableList
            items={stages}
            onReorder={reorder}
            disabled={!editable}
            className="divide-y divide-border/70 dark:divide-border/50"
            handleClassName="mr-1 h-12 w-6 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100"
          >
            {(s, handle) => {
              const sub = s.substeps ?? [];
              const late =
                s.deadline &&
                s.status !== 'done' &&
                s.status !== 'skipped' &&
                isOverdue(s.deadline);
              const details = [
                sub.length > 0 ? `${sub.filter((x) => x.done).length}/${sub.length}` : '',
                s.deadline ? `до ${dateLabel(s.deadline)}` : '',
              ].filter(Boolean);
              return (
                <div
                  className={cn(
                    'group/row flex items-center transition-colors hover:bg-groove/30',
                    editable ? 'pl-1' : 'pl-4',
                  )}
                >
                  {editable && handle}
                  <Link
                    to="/p/$projectId/songs/$songId/stages/$stageId"
                    params={{ projectId, songId, stageId: s.id }}
                    className="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-2.5 pr-3 md:min-h-11"
                  >
                    <StatusDot status={s.status} />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate',
                          s.status === 'skipped' && 'text-dim line-through',
                        )}
                      >
                        {s.title}
                      </span>
                      {details.length > 0 && (
                        <span
                          className={cn(
                            'block truncate text-xs',
                            late ? 'text-led-red' : 'text-dim',
                          )}
                        >
                          {details.join(' · ')}
                        </span>
                      )}
                    </span>
                    <AvatarStack
                      users={(s.assignees ?? []).flatMap((id) => people.get(id) ?? [])}
                    />
                    <span className={cn('shrink-0 text-sm', TEXT_CLASS[s.status])}>
                      {STAGE_STATUS_LABEL[s.status]}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-dim/60" />
                  </Link>
                </div>
              );
            }}
          </SortableList>
        )}
        {editable && (
          <AddRow
            id="new-stage"
            label="Добавить этап"
            busy={add.isPending}
            onAdd={(t) => add.mutateAsync(t)}
          />
        )}
        {!editable && stages.length === 0 && (
          <p className="px-4 py-3 text-sm text-dim">Этапов нет</p>
        )}
      </div>
    </Section>
  );
}
