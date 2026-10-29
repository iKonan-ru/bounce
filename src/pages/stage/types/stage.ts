import type {
  SongStage,
  StagePatch,
  Substep,
  StageStatus,
} from '@/entities/song';
import type { Crumb, NoteScope } from '@/shared/types';

/** Подэтап из редактора: отметки "сделано" может не быть */
export interface EditedSubstep {
  id: string;
  title: string;
  done?: boolean;
}

/** Пропсы свойств этапа */
export interface StageFieldsProps {
  projectId: string;
  stage: SongStage;
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

/** Состояние и действия страницы этапа */
export interface UseStagePageResult {
  projectId: string;
  crumbs: Crumb[];
  canEdit: boolean;
  canWork: boolean;
  isPending: boolean;
  /** Этап; undefined - нет такого этапа у песни */
  stage: SongStage | undefined;
  /** Подпись места этапа в песне: "Этап 2 из 5" */
  positionLabel: string;
  notesScope: NoteScope;
  isConfirming: boolean;
  setIsConfirming: (isConfirming: boolean) => void;
  isRemoving: boolean;
  handleSave: (patch: StagePatch) => void;
  onTitleSave: (title: string) => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
}
