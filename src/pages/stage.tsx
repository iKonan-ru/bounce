import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { MoreVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useSongCrumbs } from '@/components/crumbs';
import { DateField } from '@/components/date-field';
import { InlineTitle } from '@/components/inline-title';
import { NotesFeed } from '@/components/notes';
import { Columns, PageHeader, SectionTitle } from '@/components/page';
import { LED_CLASS } from '@/components/status';
import { SubstepsEditor } from '@/components/substeps';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { isOverdue } from '@/lib/format';
import { STAGE_STATUS_LABEL, STAGE_STATUSES, type Substep } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { songQuery, stagesOf } from '@/lib/queries';
import { type StagePatch, updateStage } from '@/lib/stages';
import { cn } from '@/lib/utils';

export function StagePage() {
  const { projectId, songId, stageId } = useParams({
    from: '/app/p/$projectId/songs/$songId/stages/$stageId',
  });
  const client = useQueryClient();
  const navigate = useNavigate();
  const song = useQuery(songQuery(songId));
  const crumbs = useSongCrumbs(projectId, songId);
  const [confirming, setConfirming] = useState(false);
  const stages = song.data ? stagesOf(song.data) : [];
  const index = stages.findIndex((s) => s.id === stageId);
  const stage = stages[index];

  const save = (patch: StagePatch) =>
    void updateStage(client, songId, stageId, patch).catch(() =>
      toast.error('Не сохранилось: проверьте соединение'),
    );

  const remove = useMutation({
    mutationFn: () => collection(pb, 'song_stages').delete(stageId),
    onSuccess: async () => {
      setConfirming(false);
      await navigate({ to: '/p/$projectId/songs/$songId', params: { projectId, songId } });
      await client.invalidateQueries({ queryKey: ['songs'] });
    },
    onError: () => toast.error('Этап не удалён: проверьте соединение'),
  });

  if (song.isPending) return <Skeleton className="h-40 rounded-xl" />;
  if (!stage) return <p className="text-led-red">Этап не найден.</p>;

  const late =
    stage.deadline &&
    stage.status !== 'done' &&
    stage.status !== 'skipped' &&
    isOverdue(stage.deadline);

  const main = (
    <div className="flex flex-col gap-8">
      <section>
        <SectionTitle>Статус</SectionTitle>
        <fieldset className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
          <legend className="sr-only">Статус этапа</legend>
          {STAGE_STATUSES.map((st) => (
            <button
              key={st}
              type="button"
              aria-pressed={stage.status === st}
              onClick={() => stage.status !== st && save({ status: st })}
              className={cn(
                'flex h-12 items-center gap-2 rounded-xl border px-3 text-sm transition-colors',
                stage.status === st
                  ? 'border-ink/30 bg-panel font-medium text-ink'
                  : 'text-dim hover:bg-panel/60',
              )}
            >
              <span className={cn('size-2.5 shrink-0 rounded-full', LED_CLASS[st])} />
              {STAGE_STATUS_LABEL[st]}
            </button>
          ))}
        </fieldset>
      </section>

      <section>
        <SectionTitle>Срок</SectionTitle>
        <DateField
          value={stage.deadline ?? ''}
          danger={Boolean(late)}
          placeholder="Без срока"
          onChange={(v) => save({ deadline: v })}
        />
      </section>

      <section>
        <SectionTitle>Подэтапы</SectionTitle>
        <SubstepsEditor
          idPrefix="substep"
          checkable
          items={stage.substeps ?? []}
          onChange={(items) =>
            save({
              substeps: items.map(
                (x): Substep => ({ id: x.id, title: x.title, done: x.done === true }),
              ),
            })
          }
        />
      </section>
    </div>
  );

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        title={
          <InlineTitle
            value={stage.title}
            label="Переименовать этап"
            onSave={(title) => save({ title })}
          />
        }
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Действия с этапом">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirming(true)}>
                <Trash2 />
                Удалить этап
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        meta={
          <p className="text-sm text-dim">
            Этап {index + 1} из {stages.length}
          </p>
        }
      />
      <Columns
        main={main}
        side={
          <>
            <SectionTitle>Заметки этапа</SectionTitle>
            <NotesFeed scope={{ project: projectId, song: songId, stage: stageId }} />
          </>
        }
      />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Удалить этап "${stage.title}"?`}
        description="Заметки этапа удалятся вместе с ним."
        confirm="Удалить"
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}
