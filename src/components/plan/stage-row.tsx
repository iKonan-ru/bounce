import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Collapse } from '@/components/collapse';
import { MentionText } from '@/components/mentions';
import { AvatarStack } from '@/components/people-picker';
import { DoneCheck, useLeaving } from '@/components/plan/done-check';
import { Due } from '@/components/plan-bits';
import { TEXT_CLASS } from '@/components/status';
import { Checkbox } from '@/components/ui/checkbox';
import { errorText, SAVE_FAILED } from '@/lib/errors';
import type { Substep } from '@/lib/model';
import { peopleById, useProjectPeople } from '@/lib/people';
import type { Bucket, PlanStage } from '@/lib/plan';
import { updateStage } from '@/lib/stages';
import { STAGE_STATUS_LABEL } from '@/lib/statuses';
import { cn } from '@/lib/utils';

// Этап песни в списке плана: отметка "готово", название, песня и ход, срок, кто делает;
// подэтапы раскрываются под строкой.
export function StageRow({
  item,
  bucket,
  projectId,
  canWork,
  onOpen,
}: {
  item: PlanStage;
  bucket: Bucket;
  projectId: string;
  canWork: boolean;
  onOpen: () => void;
}) {
  const client = useQueryClient();
  const people = peopleById(useProjectPeople(projectId));
  const { stage, song } = item;
  const [open, setOpen] = useState(false);
  const [leaving, leave] = useLeaving();
  const subs = stage.substeps ?? [];
  const assignees = item.assignees.flatMap((id) => people.get(id) ?? []);
  const save = (patch: Parameters<typeof updateStage>[3]) =>
    updateStage(client, song.id, stage.id, patch);

  const finish = () =>
    leave(() => {
      const before = stage.status;
      save({ status: 'done' })
        .then(() =>
          toast(`${stage.title}: готово`, {
            action: {
              label: 'Отменить',
              onClick: () => void save({ status: before }).catch(() => undefined),
            },
          }),
        )
        .catch((e) => toast.error(errorText(e, SAVE_FAILED)));
    });

  const tick = (id: string, done: boolean) =>
    void save({
      substeps: subs.map((x): Substep => (x.id === id ? { ...x, done } : x)),
    }).catch((e) => toast.error(errorText(e, SAVE_FAILED)));

  const details = [
    song.title,
    stage.status === 'in_progress' ? STAGE_STATUS_LABEL.in_progress : '',
    subs.length > 0 ? `${subs.filter((x) => x.done).length}/${subs.length}` : '',
  ].filter(Boolean);

  return (
    <div className={cn('transition-opacity duration-300', leaving && 'opacity-50')}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <DoneCheck
          checked={leaving}
          label={`${stage.title}: готово`}
          disabled={!canWork}
          onDone={(d) => d && finish()}
        />
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-9 min-w-0 flex-1 flex-col justify-center text-left"
        >
          <span className={cn('text-pretty', leaving && 'text-dim line-through')}>
            {stage.title}
          </span>
          <span
            className={cn(
              'truncate text-xs',
              stage.status === 'in_progress' ? TEXT_CLASS.in_progress : 'text-dim',
            )}
          >
            <span className="text-dim">{details[0]}</span>
            {details.length > 1 && ` · ${details.slice(1).join(' · ')}`}
          </span>
        </button>
        <Due due={item.due} bucket={bucket} />
        <AvatarStack users={assignees} />
        {subs.length > 0 && (
          <button
            type="button"
            aria-expanded={open}
            aria-label="Подэтапы"
            onClick={() => setOpen(!open)}
            className="-mr-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-groove hover:text-ink"
          >
            <ChevronDown
              className={cn('size-4 transition-transform duration-200', open && 'rotate-180')}
            />
          </button>
        )}
      </div>
      {subs.length > 0 && (
        <Collapse open={open}>
          <ul className="flex flex-col pb-2 pl-12">
            {subs.map((x) => (
              <li key={x.id} className="flex min-h-10 items-center gap-3 pr-4 md:min-h-8">
                <Checkbox
                  aria-label={x.title}
                  disabled={!canWork}
                  className="size-[1.125rem] rounded-full disabled:opacity-100"
                  checked={x.done}
                  onCheckedChange={(v) => tick(x.id, v === true)}
                />
                <span
                  className={cn('min-w-0 text-sm text-pretty', x.done && 'text-dim line-through')}
                >
                  <MentionText text={x.title} />
                </span>
              </li>
            ))}
          </ul>
        </Collapse>
      )}
    </div>
  );
}
