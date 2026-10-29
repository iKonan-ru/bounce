import type { Substep } from '@/entities/song';
import type { User } from '@/entities/user';
import type { Bucket } from '@/shared/types';
import type { PlanStage } from './plan';

/** Пропсы этапа песни в списке плана */
export interface StageRowProps {
  item: PlanStage;
  bucket: Bucket;
  projectId: string;
  /** Можно отмечать этап и подэтапы */
  canWork: boolean;
  /** Открыть окно этапа */
  onOpen: () => void;
}

/** Данные и действия строки этапа */
export interface UseStageRowResult {
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

/** Пропсы подэтапа под строкой этапа */
export interface SubstepRowProps {
  substep: Substep;
  disabled: boolean;
  /** Подэтап отметили или сняли отметку */
  onCheckedChange: (substepId: string, isDone: boolean) => void;
}
