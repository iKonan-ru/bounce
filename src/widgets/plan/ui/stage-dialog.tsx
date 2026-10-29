import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { PeoplePicker } from '@/entities/project';
import { StatusDot, StageStatusPicker } from '@/entities/song';
import { GROUP_ROWS } from '@/shared/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  PropRow,
  DateField,
  DialogFooter,
  Button,
} from '@/shared/ui';
import { Link } from '@tanstack/react-router';
import { useStageDialog } from '../hooks/use-stage-dialog';
import type { StageDialogProps } from '../types/stage-dialog';
import { SubstepsEditor } from './substeps-editor';

/** Этап из плана: статус, кто делает, срок и подэтапы - не уходя со страницы плана */
export function StageDialog({
  stage,
  song,
  projectId,
  canWork,
  open,
  onOpenChange,
}: StageDialogProps): ReactNode {
  const {
    substeps,
    isOverdue,
    deadline,
    assignees,
    showSubsteps,
    substepsIdPrefix,
    stageLinkParams,
    onStatusChange,
    onAssigneesChange,
    onDeadlineChange,
    onSubstepsChange,
    onDoneClick,
  } = useStageDialog({ stage, song, projectId, canWork, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4">
        <DialogHeader>
          <div className="flex items-start gap-2 pr-8">
            <span className="flex size-8 shrink-0 items-center justify-center">
              <StatusDot status={stage.status} />
            </span>
            <div className="min-w-0 text-left">
              <DialogTitle className="text-lg leading-8 font-medium text-pretty">
                {stage.title}
              </DialogTitle>
              <p className="text-sm text-dim">{song.title}</p>
            </div>
          </div>
        </DialogHeader>
        <div className={GROUP_ROWS}>
          <PropRow label="Статус">
            <StageStatusPicker
              value={stage.status}
              readOnly={!canWork}
              onChange={onStatusChange}
            />
          </PropRow>
          <PropRow label="Кто делает">
            <PeoplePicker
              projectId={projectId}
              value={assignees}
              disabled={!canWork}
              onChange={onAssigneesChange}
            />
          </PropRow>
          <PropRow label="Срок">
            <DateField
              isQuiet
              disabled={!canWork}
              value={deadline}
              isOverdue={isOverdue}
              placeholder="Без срока"
              onChange={onDeadlineChange}
            />
          </PropRow>
        </div>
        {showSubsteps && (
          <SubstepsEditor
            idPrefix={substepsIdPrefix}
            projectId={projectId}
            isCheckable
            readOnly={!canWork}
            items={substeps}
            onChange={onSubstepsChange}
          />
        )}
        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <Button variant="ghost" className="-ml-3.5 text-dim" asChild>
            <Link
              to="/p/$projectId/songs/$songId/stages/$stageId"
              params={stageLinkParams}
            >
              Открыть этап
              <ChevronRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button variant="secondary" onClick={onDoneClick}>
            Готово
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
