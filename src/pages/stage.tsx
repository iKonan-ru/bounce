import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useSongCrumbs } from '@/components/crumbs';
import { DateField } from '@/components/date-field';
import { InlineTitle } from '@/components/inline-title';
import { NotesFeed } from '@/components/notes';
import { Columns, GROUP_ROWS, PageHeader, Section } from '@/components/page';
import { PersonSelect } from '@/components/person-select';
import { PropRow } from '@/components/prop-row';
import { StageStatusPicker } from '@/components/stage-status';
import { SubstepsEditor } from '@/components/substeps';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccess } from '@/lib/access';
import { isOverdue } from '@/lib/format';
import type { Substep } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { songQuery, stagesOf } from '@/lib/queries';
import { type StagePatch, updateStage } from '@/lib/stages';

export function StagePage() {
  const { projectId, songId, stageId } = useParams({
    from: '/app/p/$projectId/songs/$songId/stages/$stageId',
  });
  const client = useQueryClient();
  const navigate = useNavigate();
  const song = useQuery(songQuery(songId));
  const crumbs = useSongCrumbs(projectId, songId);
  const access = useAccess(projectId);
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
  const subs = stage.substeps ?? [];

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        title={
          access.edit ? (
            <InlineTitle
              value={stage.title}
              label="Переименовать этап"
              onSave={(title) => save({ title })}
            />
          ) : (
            stage.title
          )
        }
        meta={`Этап ${index + 1} из ${stages.length}`}
        actions={
          access.edit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Действия с этапом"
                  className="text-dim"
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirming(true)}>
                  <Trash2 />
                  Удалить этап
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      />
      <Columns
        main={
          <div className="flex flex-col gap-8">
            <div className={GROUP_ROWS}>
              <PropRow label="Статус">
                <StageStatusPicker
                  value={stage.status}
                  readOnly={!access.work}
                  onChange={(status) => save({ status })}
                />
              </PropRow>
              <PropRow label="Кто делает">
                <PersonSelect
                  projectId={projectId}
                  value={stage.assignee ?? ''}
                  disabled={!access.work}
                  onChange={(assignee) => save({ assignee })}
                />
              </PropRow>
              <PropRow label="Срок">
                <DateField
                  quiet
                  disabled={!access.work}
                  value={stage.deadline ?? ''}
                  danger={Boolean(late)}
                  placeholder="Без срока"
                  onChange={(v) => save({ deadline: v })}
                />
              </PropRow>
            </div>
            <Section
              title="Подэтапы"
              action={
                subs.length > 0 && (
                  <span className="text-sm text-dim tabular-nums">
                    {subs.filter((x) => x.done).length} из {subs.length}
                  </span>
                )
              }
            >
              <SubstepsEditor
                idPrefix="substep"
                checkable
                readOnly={!access.work}
                items={subs}
                onChange={(items) =>
                  save({
                    substeps: items.map(
                      (x): Substep => ({ id: x.id, title: x.title, done: x.done === true }),
                    ),
                  })
                }
              />
            </Section>
            {access.edit && (
              <div>
                <Button
                  variant="ghost"
                  className="-ml-2 text-led-red hover:bg-led-red/10 hover:text-led-red"
                  onClick={() => setConfirming(true)}
                >
                  <Trash2 data-icon="inline-start" />
                  Удалить этап
                </Button>
              </div>
            )}
          </div>
        }
        side={
          <Section title="Заметки">
            <NotesFeed scope={{ project: projectId, song: songId, stage: stageId }} />
          </Section>
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
