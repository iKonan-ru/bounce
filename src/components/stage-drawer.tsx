import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type SongStage, STAGE_STATUS_LABEL, STAGE_STATUS_ORDER } from '@/lib/model';
import { type StagePatch, updateStage } from '@/lib/stages';
import { cn } from '@/lib/utils';
import { NotesFeed } from './notes-feed';
import { LED_CLASS } from './status';

type Props = {
  projectId: string;
  songId: string;
  stage: SongStage | undefined;
  onOpenChange: (open: boolean) => void;
};

export function StageDrawer({ projectId, songId, stage, onOpenChange }: Props) {
  const client = useQueryClient();
  const [note, setNote] = useState('');

  // заметка - черновик в поле; при открытии другого этапа берётся его текст
  const stageId = stage?.id;
  const savedNote = stage?.note ?? '';
  useEffect(() => {
    if (stageId) setNote(savedNote);
  }, [stageId, savedNote]);

  const save = useMutation({
    mutationFn: (patch: StagePatch) => {
      if (!stageId) throw new Error('этап не выбран');
      return updateStage(client, songId, stageId, patch);
    },
    onError: () => toast.error('Не сохранилось: проверьте соединение и повторите'),
  });

  const substeps = stage?.substeps ?? [];

  return (
    <Drawer open={stage !== undefined} onOpenChange={onOpenChange}>
      <DrawerContent>
        {stage && (
          <div className="mx-auto flex w-full max-w-xl flex-col gap-6 overflow-y-auto px-4 pb-6">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle className="text-lg">{stage.title}</DrawerTitle>
              <DrawerDescription>
                Этап {stage.position + 1}
                {stage.optional ? ', необязательный' : ''}
              </DrawerDescription>
            </DrawerHeader>

            <fieldset className="grid grid-cols-2 gap-2" disabled={save.isPending}>
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
                          disabled={save.isPending}
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
                disabled={save.isPending || note === savedNote}
                onClick={() => save.mutate({ note })}
              >
                Сохранить заметку
              </Button>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Идеи и комментарии этапа</h3>
              <NotesFeed
                scope={{ project: projectId, song: songId, stage: stage.id }}
                empty="Записей по этапу пока нет."
                surface="sheet"
              />
            </section>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
