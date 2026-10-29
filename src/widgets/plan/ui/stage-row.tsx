import { ChevronDown } from 'lucide-react';
import type { Checkbox as CheckboxPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';
import { AvatarStack } from '@/entities/project';
import { TEXT_CLASS, StageStatus } from '@/entities/song';
import { MentionText } from '@/entities/user';
import { DoneCheck, Due, Collapse, Checkbox } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { useStageRow } from '../hooks/use-stage-row';
import type { StageRowProps, SubstepRowProps } from '../types/stage-row';

/**
 * Этап песни в списке плана: отметка "готово", название, песня и ход, срок, кто делает
 *
 * Подэтапы раскрываются под строкой
 */
export function StageRow({
  item,
  bucket,
  projectId,
  canWork,
  onOpen,
}: StageRowProps): ReactNode {
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
  const rowClassName = cn('transition-opacity duration-300', {
    'opacity-50': isLeaving,
  });
  const titleClassName = cn('text-pretty', {
    'text-dim line-through': isLeaving,
  });
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

/** Подэтап под строкой этапа: отметка и название */
function SubstepRow({
  substep,
  disabled,
  onCheckedChange,
}: SubstepRowProps): ReactNode {
  const onSubstepCheckedChange = (
    state: CheckboxPrimitive.CheckedState
  ): void => {
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
