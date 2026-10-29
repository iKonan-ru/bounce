import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { PeoplePicker } from '@/components/people-picker';
import { StatusDot, StageStatusPicker } from '@/components/stage-status';
import { SubstepsEditor } from '@/components/substeps';
import type { SongStage, Song, Substep, StageStatus } from '@/lib/model';
import type { StagePatch } from '@/lib/stages';
import { updateStage } from '@/lib/stages';
import { CLOSED_STAGE_STATUSES } from '@/lib/statuses';
import { getErrorText } from '@/shared/api';
import { SAVE_FAILED, GROUP_ROWS } from '@/shared/constants';
import { Bucket } from '@/shared/types';
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
import { getBucket } from '@/shared/utils';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';

/** Пропсы окна этапа из плана */
interface StageDialogProps {
  stage: SongStage;
  song: Song;
  projectId: string;
  /** Можно править этап */
  canWork: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Пункт чек-листа из редактора подэтапов: отметка может быть не задана */
interface ChecklistItem extends Pick<Substep, 'id' | 'title'> {
  done?: boolean;
}

/** Параметры ссылки на страницу этапа */
interface StageLinkParams {
  projectId: string;
  songId: string;
  stageId: string;
}

/** Данные и действия окна этапа */
interface UseStageDialogResult {
  substeps: Substep[];
  /** Срок прошёл, а этап не закрыт */
  isOverdue: boolean;
  deadline: string;
  assignees: string[];
  /** Показать редактор подэтапов: можно править или подэтапы уже есть */
  showSubsteps: boolean;
  substepsIdPrefix: string;
  stageLinkParams: StageLinkParams;
  onStatusChange: (status: StageStatus) => void;
  onAssigneesChange: (assignees: string[]) => void;
  onDeadlineChange: (deadline: string) => void;
  onSubstepsChange: (items: ChecklistItem[]) => void;
  onDoneClick: () => void;
}

/** Пункт чек-листа как подэтап: без отметки - не сделан */
function convertToSubstep(item: ChecklistItem): Substep {
  return { id: item.id, title: item.title, done: item.done === true };
}

/** Окно этапа: правки сразу в кэше и на сервере, просрочка и подэтапы */
function useStageDialog({
  stage,
  song,
  projectId,
  canWork,
  onOpenChange,
}: Omit<StageDialogProps, 'open'>): UseStageDialogResult {
  const client = useQueryClient();
  const save = (patch: StagePatch): void => {
    void updateStage(client, song.id, stage.id, patch).catch(
      (error: unknown) => {
        toast.error(getErrorText(error, SAVE_FAILED));
      }
    );
  };
  const onStatusChange = (status: StageStatus): void => {
    save({ status });
  };
  const onAssigneesChange = (assignees: string[]): void => {
    save({ assignees });
  };
  const onDeadlineChange = (deadline: string): void => {
    save({ deadline });
  };
  const onSubstepsChange = (items: ChecklistItem[]): void => {
    save({ substeps: items.map(convertToSubstep) });
  };
  const onDoneClick = (): void => {
    onOpenChange(false);
  };

  const substeps = stage.substeps ?? [];
  const hasSubsteps = substeps.length > 0;
  const deadline = stage.deadline ?? '';
  const isClosed = CLOSED_STAGE_STATUSES.has(stage.status);
  const isOverdueBucket = getBucket(deadline, new Date()) === Bucket.Overdue;
  const isOverdue = !isClosed && isOverdueBucket;

  return {
    substeps,
    isOverdue,
    deadline,
    assignees: stage.assignees ?? [],
    showSubsteps: canWork || hasSubsteps,
    substepsIdPrefix: `plan-${stage.id}`,
    stageLinkParams: { projectId, songId: song.id, stageId: stage.id },
    onStatusChange,
    onAssigneesChange,
    onDeadlineChange,
    onSubstepsChange,
    onDoneClick,
  };
}

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
