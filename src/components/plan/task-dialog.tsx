import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DateField } from '@/components/date-field';
import { EditableTitle } from '@/components/editable-title';
import { ItemDialogFooter } from '@/components/item-dialog-footer';
import { MenuSelect } from '@/components/menu-select';
import { GROUP_ROWS } from '@/components/page';
import { PeoplePicker } from '@/components/people-picker';
import { DoneCheck } from '@/components/plan/done-check';
import { PropRow } from '@/components/prop-row';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { errorText, SAVE_FAILED } from '@/lib/errors';
import { mentionedIds } from '@/lib/mentions';
import type { Task } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { useProjectPeople } from '@/lib/people';
import { bucketOf } from '@/lib/plan';
import { songsQuery } from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import { updateTask } from '@/lib/tasks';

const NO_SONG = 'none';

// Задача целиком: название, срок, кто делает, песня; удалить.
export function TaskDialog({
  task,
  canWork,
  open,
  onOpenChange,
}: {
  task: Task;
  canWork: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const client = useQueryClient();
  const songs = useQuery(songsQuery(task.project));

  const save = (patch: Parameters<typeof updateTask>[2]) =>
    void updateTask(client, task, patch).catch((e) => toast.error(errorText(e, SAVE_FAILED)));
  const remove = useMutation({
    mutationFn: () => collection(pb, 'tasks').delete(task.id),
    onSuccess: async () => {
      onOpenChange(false);
      await client.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
    onError: (e) => toast.error(errorText(e, 'Задача не удалена: проверьте соединение')),
  });
  const workers = useProjectPeople(task.project, 'workers');
  // новые упомянутые в названии становятся исполнителями
  const commitTitle = (t: string) => {
    const current = task.assignees ?? [];
    const added = mentionedIds(t, workers).filter((id) => !current.includes(id));
    save(added.length > 0 ? { title: t, assignees: [...current, ...added] } : { title: t });
  };
  const bucket = bucketOf(task.due ?? '', new Date());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4">
        <DialogHeader>
          <DialogTitle className="sr-only">Задача</DialogTitle>
          <div className="flex items-start gap-2 pr-8">
            <DoneCheck
              checked={task.done === true}
              label="Выполнено"
              disabled={!canWork}
              onDone={(done) => save({ done })}
              className="m-0 size-8"
            />
            <EditableTitle
              id="task-title"
              label="Название"
              value={task.title}
              projectId={task.project}
              disabled={!canWork}
              onCommit={commitTitle}
            />
          </div>
        </DialogHeader>
        <div className={GROUP_ROWS}>
          <PropRow label="Срок">
            <DateField
              quiet
              id="task-due"
              disabled={!canWork}
              value={task.due ?? ''}
              danger={bucket === 'overdue' && !task.done}
              placeholder="Без срока"
              onChange={(due) => save({ due })}
            />
          </PropRow>
          <PropRow label="Кто делает">
            <PeoplePicker
              projectId={task.project}
              value={task.assignees ?? []}
              disabled={!canWork}
              onChange={(assignees) => save({ assignees })}
            />
          </PropRow>
          <PropRow label="Песня">
            <MenuSelect
              label="Песня"
              value={task.song || NO_SONG}
              dim={!task.song}
              disabled={!canWork}
              onChange={(v) => save({ song: v === NO_SONG ? '' : v })}
              options={[
                ...(songs.data ?? []).map((s) => ({ value: s.id, label: s.title })),
                { value: NO_SONG, label: 'Без песни', separated: (songs.data ?? []).length > 0 },
              ]}
            />
          </PropRow>
        </div>
        <ItemDialogFooter
          canWork={canWork}
          title={task.title}
          deleting={remove.isPending}
          onDelete={() => remove.mutate()}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
