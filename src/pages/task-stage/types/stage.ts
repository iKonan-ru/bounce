import type { TaskStage } from '@/entities/project-task';
import type { StagePatch } from '@/entities/song';
import type { Crumb, NoteScope } from '@/shared/types';

/** Состояние и действия страницы этапа */
export interface UseTaskStagePageResult {
  projectId: string;
  crumbs: Crumb[];
  canEdit: boolean;
  canWork: boolean;
  isPending: boolean;
  /** Этап; undefined - нет такого этапа у раздела */
  stage: TaskStage | undefined;
  /** Подпись места этапа в раздела: "Этап 2 из 5" */
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
