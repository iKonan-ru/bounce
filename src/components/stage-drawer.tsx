import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { StageFindings } from '@/components/stage-findings';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { fromDateInput, toDateInput } from '@/lib/format';
import { type SongStage, STAGE_STATUS_LABEL, STAGE_STATUS_ORDER } from '@/lib/model';
import { moved, savePositions } from '@/lib/order';
import { collection, pb } from '@/lib/pb';
import { type StagePatch, updateStage } from '@/lib/stages';
import { cn } from '@/lib/utils';
import { NotesFeed } from './notes-feed';
import { LED_CLASS } from './status';

type Props = {
  projectId: string;
  songId: string;
  // все этапы песни по порядку: номер этапа и сдвиг вверх-вниз
  stages: ReadonlyArray<SongStage>;
  stage: SongStage | undefined;
  onOpenChange: (open: boolean) => void;
};

export function StageDrawer({ projectId, songId, stages, stage, onOpenChange }: Props) {
  const client = useQueryClient();
  const [note, setNote] = useState('');
  const [title, setTitle] = useState('');
  const [deleting, setDeleting] = useState(false);

  // черновики полей; при открытии другого этапа берутся его значения
  const stageId = stage?.id;
  const savedNote = stage?.note ?? '';
  const savedTitle = stage?.title ?? '';
  useEffect(() => {
    if (stageId) setNote(savedNote);
  }, [stageId, savedNote]);
  useEffect(() => {
    if (stageId) setTitle(savedTitle);
  }, [stageId, savedTitle]);

  const index = stages.findIndex((s) => s.id === stageId);

  const move = useMutation({
    mutationFn: (step: -1 | 1) => {
      if (!stageId) throw new Error('этап не выбран');
      return savePositions(pb, 'song_stages', moved(stages, stageId, step));
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['songs'] }),
    onError: () => toast.error('Порядок не сохранился: проверьте соединение'),
  });

  const remove = useMutation({
    mutationFn: () => {
      if (!stageId) throw new Error('этап не выбран');
      return collection(pb, 'song_stages').delete(stageId);
    },
    onSuccess: async () => {
      setDeleting(false);
      onOpenChange(false);
      await client.invalidateQueries({ queryKey: ['songs'] });
    },
    onError: () => toast.error('Этап не удалён: проверьте соединение'),
  });

  const save = useMutation({
    mutationFn: (patch: StagePatch) => {
      if (!stageId) throw new Error('этап не выбран');
      return updateStage(client, songId, stageId, patch);
    },
    onError: () => toast.error('Не сохранилось: проверьте соединение и повторите'),
  });

  const substeps = stage?.substeps ?? [];
  const busy = save.isPending || move.isPending || remove.isPending;

  return (
    <Drawer open={stage !== undefined} onOpenChange={onOpenChange}>
      <DrawerContent>
        {stage && (
          <div className="mx-auto flex w-full max-w-xl flex-col gap-6 overflow-y-auto px-4 pb-6">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle className="text-lg">{stage.title}</DrawerTitle>
              <DrawerDescription>
                Этап {index + 1}
                {stage.optional ? ', необязательный' : ''}
              </DrawerDescription>
            </DrawerHeader>

            <fieldset className="grid grid-cols-2 gap-2" disabled={busy}>
              <legend className="sr-only">Статус</legend>
              {STAGE_STATUS_ORDER.map((status) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={stage.status === status}
                  onClick={() => stage.status !== status && save.mutate({ status })}
                  className={cn(
                    'flex h-12 items-center gap-3 rounded-lg border px-3 text-left text-sm transition-colors disabled:opacity-60',
                    stage.status === status
                      ? 'border-ink/40 bg-groove text-ink'
                      : 'border-border text-dim active:bg-groove',
                    status === 'skipped' && 'col-span-2',
                  )}
                >
                  <span className={cn('size-2.5 shrink-0 rounded-full', LED_CLASS[status])} />
                  {STAGE_STATUS_LABEL[status]}
                </button>
              ))}
            </fieldset>

            {substeps.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-medium">
                  Подэтапы{' '}
                  <span className="text-dim">
                    {substeps.filter((s) => s.done).length} из {substeps.length}
                  </span>
                </h3>
                <ul className="flex flex-col">
                  {substeps.map((s, i) => {
                    const id = `substep-${stage.id}-${i}`;
                    return (
                      <li key={id} className="flex items-center gap-3 py-2">
                        <Checkbox
                          id={id}
                          checked={s.done}
                          disabled={busy}
                          onCheckedChange={(v) =>
                            save.mutate({
                              substeps: substeps.map((x, j) =>
                                j === i ? { ...x, done: v === true } : x,
                              ),
                            })
                          }
                          className="size-5"
                        />
                        <Label htmlFor={id} className={cn('text-sm', s.done && 'text-dim')}>
                          {s.title}
                        </Label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor={`deadline-${stage.id}`}>Срок</Label>
              <Input
                id={`deadline-${stage.id}`}
                type="date"
                value={toDateInput(stage.deadline)}
                disabled={busy}
                onChange={(e) => save.mutate({ deadline: fromDateInput(e.target.value) })}
              />
            </div>

            <section className="flex flex-col gap-2">
              <Label htmlFor={`note-${stage.id}`}>Заметка</Label>
              <Textarea
                id={`note-${stage.id}`}
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button
                variant="secondary"
                disabled={busy || note === savedNote}
                onClick={() => save.mutate({ note })}
              >
                Сохранить заметку
              </Button>
            </section>

            <StageFindings projectId={projectId} songId={songId} stageId={stage.id} />

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Идеи и комментарии этапа</h3>
              <NotesFeed
                scope={{ project: projectId, song: songId, stage: stage.id }}
                empty="Записей по этапу пока нет."
                surface="sheet"
              />
            </section>

            <details className="rounded-xl bg-console p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Этап: название и порядок
              </summary>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (title.trim() && title.trim() !== stage.title)
                    save.mutate({ title: title.trim() });
                }}
              >
                <label htmlFor={`title-${stage.id}`} className="sr-only">
                  Название этапа
                </label>
                <Input
                  id={`title-${stage.id}`}
                  maxLength={120}
                  value={title}
                  disabled={busy}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-panel"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  className="h-11"
                  disabled={busy || !title.trim() || title.trim() === stage.title}
                >
                  Сохранить
                </Button>
              </form>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  disabled={busy || index <= 0}
                  onClick={() => move.mutate(-1)}
                >
                  <ArrowUp data-icon="inline-start" />
                  Выше
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy || index < 0 || index >= stages.length - 1}
                  onClick={() => move.mutate(1)}
                >
                  <ArrowDown data-icon="inline-start" />
                  Ниже
                </Button>
                <Button
                  variant="destructive"
                  className="ml-auto"
                  disabled={busy}
                  onClick={() => setDeleting(true)}
                >
                  Удалить этап
                </Button>
              </div>
            </details>
          </div>
        )}
        {stage && (
          <ConfirmDialog
            open={deleting}
            onOpenChange={setDeleting}
            title={`Удалить этап \u00ab${stage.title}\u00bb?`}
            description="Удалятся его заметка, подэтапы и лента. Шаблон проекта не изменится."
            confirm="Удалить этап"
            busy={remove.isPending}
            onConfirm={() => remove.mutate()}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
