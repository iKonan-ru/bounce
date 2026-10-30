import type {
  SongStage,
  StagePatch,
  Substep,
  StageStatus,
} from '@/entities/song';

/** Подэтап из редактора: отметки "сделано" может не быть */
export interface EditedSubstep {
  id: string;
  title: string;
  done?: boolean;
}

/** Пропсы свойств этапа */
export interface StageFieldsProps {
  projectId: string;
  stage: Pick<SongStage, 'status' | 'assignees' | 'deadline'>;
  canWork: boolean;
  onSave: (patch: StagePatch) => void;
}

/** Значения и обработчики свойств этапа */
export interface UseStageFieldsResult {
  assignees: string[];
  deadline: string;
  isLate: boolean;
  onStatusChange: (status: StageStatus) => void;
  onAssigneesChange: (ids: string[]) => void;
  onDeadlineChange: (day: string) => void;
}

/** Пропсы секции подэтапов */
export interface SubstepsSectionProps {
  projectId: string;
  substeps: Substep[];
  canWork: boolean;
  onSave: (patch: StagePatch) => void;
}
