import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import type { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { Collapse } from '@/components/collapse';
import { MentionText } from '@/components/mentions';
import { AvatarStack } from '@/components/people-picker';
import { DoneCheck, useLeaving } from '@/components/plan/done-check';
import { Due } from '@/components/plan-bits';
import { TEXT_CLASS } from '@/components/status';
import { Checkbox } from '@/components/ui/checkbox';
import { getErrorText, SAVE_FAILED } from '@/lib/errors';
import { StageStatus, type Substep, type User } from '@/lib/model';
import { getPeopleById, useProjectPeople } from '@/lib/people';
import type { Bucket, PlanStage } from '@/lib/plan';
import { type StagePatch, updateStage } from '@/lib/stages';
import { STAGE_STATUS_LABEL } from '@/lib/statuses';
import { cn } from '@/lib/utils';

/** Пропсы этапа песни в списке плана */
interface StageRowProps {
  item: PlanStage;
  bucket: Bucket;
  projectId: string;
  /** Можно отмечать этап и подэтапы */
  canWork: boolean;
  /** Открыть окно этапа */
  onOpen: () => void;
}

/** Данные и действия строки этапа */
interface UseStageRowResult {
  substeps: Substep[];
  hasSubsteps: boolean;
  assignees: User[];
  /** Подэтапы раскрыты под строкой */
  isOpen: boolean;
  isLeaving: boolean;
  isInProgress: boolean;
  /** Подпись отметки "готово" для экранного диктора */
  doneLabel: string;
  /** Первая подробность под названием - название песни */
  firstDetail: string | undefined;
  hasRestDetails: boolean;
  /** Остальные подробности: статус "в работе" и ход подэтапов */
  restDetailsText: string;
  onDoneChange: (isDone: boolean) => void;
  onSubstepsToggleClick: () => void;
  onSubstepCheckedChange: (substepId: string, isDone: boolean) => void;
}

/** Строка этапа: отметка "готово" с отменой в тосте, подэтапы и подробности под названием */
function useStageRow(item: PlanStage, projectId: string): UseStageRowResult {
  const client = useQueryClient();
  const people = getPeopleById(useProjectPeople(projectId));
  const { stage, song } = item;
  const [isOpen, setIsOpen] = useState(false);
  const { isLeaving, leave } = useLeaving();
  const substeps = stage.substeps ?? [];
  const hasSubsteps = substeps.length > 0;
  const assignees = item.assignees.flatMap((userId) => people.get(userId) ?? []);
  const isInProgress = stage.status === StageStatus.in_progress;
  const doneLabel = `${stage.title}: готово`;

  const save = (patch: StagePatch): Promise<void> => updateStage(client, song.id, stage.id, patch);

  const handleFinish = (): void => {
    const previousStatus = stage.status;
    const onUndoClick = (): void => {
      void save({ status: previousStatus }).catch(console.error);
    };
    const showDoneToast = (): void => {
      toast(doneLabel, { action: { label: 'Отменить', onClick: onUndoClick } });
    };
    save({ status: StageStatus.done })
      .then(showDoneToast)
      .catch((error: unknown) => {
        toast.error(getErrorText(error, SAVE_FAILED));
      });
  };

  const onDoneChange = (isDone: boolean): void => {
    if (isDone) {
      leave(handleFinish);
    }
  };

  const onSubstepsToggleClick = (): void => {
    setIsOpen(!isOpen);
  };

  const onSubstepCheckedChange = (substepId: string, isDone: boolean): void => {
    const updateSubstep = (substep: Substep): Substep => {
      if (substep.id !== substepId) {
        return substep;
      }
      return { ...substep, done: isDone };
    };
    void save({ substeps: substeps.map(updateSubstep) }).catch((error: unknown) => {
      toast.error(getErrorText(error, SAVE_FAILED));
    });
  };

  const statusDetail = isInProgress ? STAGE_STATUS_LABEL[StageStatus.in_progress] : '';
  const doneSubstepsCount = substeps.filter((substep) => substep.done).length;
  const substepsProgress = `${doneSubstepsCount}/${substeps.length}`;
  const substepsDetail = hasSubsteps ? substepsProgress : '';
  const [firstDetail, ...restDetails] = [song.title, statusDetail, substepsDetail].filter(Boolean);
  const hasRestDetails = restDetails.length > 0;
  const restDetailsText = ` \u00B7 ${restDetails.join(' \u00B7 ')}`;

  return {
    substeps,
    hasSubsteps,
    assignees,
    isOpen,
    isLeaving,
    isInProgress,
    doneLabel,
    firstDetail,
    hasRestDetails,
    restDetailsText,
    onDoneChange,
    onSubstepsToggleClick,
    onSubstepCheckedChange,
  };
}

/**
 * Этап песни в списке плана: отметка "готово", название, песня и ход, срок, кто делает
 *
 * Подэтапы раскрываются под строкой
 */
export function StageRow({ item, bucket, projectId, canWork, onOpen }: StageRowProps): ReactNode {
  const {
    substeps,
    hasSubsteps,
    assignees,
    isOpen,
    isLeaving,
    isInProgress,
    doneLabel,
    firstDetail,
    hasRestDetails,
    restDetailsText,
    onDoneChange,
    onSubstepsToggleClick,
    onSubstepCheckedChange,
  } = useStageRow(item, projectId);
  const rowClassName = cn('transition-opacity duration-300', { 'opacity-50': isLeaving });
  const titleClassName = cn('text-pretty', { 'text-dim line-through': isLeaving });
  const detailsClassName = cn('truncate text-xs', {
    [TEXT_CLASS[StageStatus.in_progress]]: isInProgress,
    'text-dim': !isInProgress,
  });
  const chevronClassName = cn('size-4 transition-transform duration-200', {
    'rotate-180': isOpen,
  });

  return (
    <div className={rowClassName}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <DoneCheck
          checked={isLeaving}
          label={doneLabel}
          disabled={!canWork}
          onDone={onDoneChange}
        />
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-9 min-w-0 flex-1 flex-col justify-center text-left"
        >
          <span className={titleClassName}>{item.stage.title}</span>
          <span className={detailsClassName}>
            <span className="text-dim">{firstDetail}</span>
            {hasRestDetails && restDetailsText}
          </span>
        </button>
        <Due due={item.due} bucket={bucket} />
        <AvatarStack users={assignees} />
        {hasSubsteps && (
          <button
            type="button"
            aria-expanded={isOpen}
            aria-label="Подэтапы"
            onClick={onSubstepsToggleClick}
            className="-mr-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-groove hover:text-ink"
          >
            <ChevronDown className={chevronClassName} />
          </button>
        )}
      </div>
      {hasSubsteps && (
        <Collapse isOpen={isOpen}>
          <ul className="flex flex-col pb-2 pl-12">
            {substeps.map((substep) => (
              <SubstepRow
                key={substep.id}
                substep={substep}
                disabled={!canWork}
                onCheckedChange={onSubstepCheckedChange}
              />
            ))}
          </ul>
        </Collapse>
      )}
    </div>
  );
}

/** Пропсы подэтапа под строкой этапа */
interface SubstepRowProps {
  substep: Substep;
  disabled: boolean;
  /** Подэтап отметили или сняли отметку */
  onCheckedChange: (substepId: string, isDone: boolean) => void;
}

/** Подэтап под строкой этапа: отметка и название */
function SubstepRow({ substep, disabled, onCheckedChange }: SubstepRowProps): ReactNode {
  const onSubstepCheckedChange = (state: CheckboxPrimitive.CheckedState): void => {
    onCheckedChange(substep.id, state === true);
  };
  const titleClassName = cn('min-w-0 text-sm text-pretty', {
    'text-dim line-through': substep.done,
  });
  return (
    <li className="flex min-h-10 items-center gap-3 pr-4 md:min-h-8">
      <Checkbox
        aria-label={substep.title}
        disabled={disabled}
        className="size-[1.125rem] rounded-full disabled:opacity-100"
        checked={substep.done}
        onCheckedChange={onSubstepCheckedChange}
      />
      <span className={titleClassName}>
        <MentionText text={substep.title} />
      </span>
    </li>
  );
}
