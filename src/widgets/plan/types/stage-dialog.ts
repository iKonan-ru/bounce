import type { SongStage, Song, Substep, StageStatus } from '@/entities/song';

/** Пропсы окна этапа из плана */
export interface StageDialogProps {
  stage: SongStage;
  song: Song;
  projectId: string;
  /** Можно править этап */
  canWork: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Пункт чек-листа из редактора подэтапов: отметка может быть не задана */
export interface ChecklistItem extends Pick<Substep, 'id' | 'title'> {
  done?: boolean;
}

/** Параметры ссылки на страницу этапа */
interface StageLinkParams {
  projectId: string;
  songId: string;
  stageId: string;
}

/** Данные и действия окна этапа */
export interface UseStageDialogResult {
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
