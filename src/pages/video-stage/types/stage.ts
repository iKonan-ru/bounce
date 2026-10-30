import type { StagePatch } from '@/entities/song';
import type { VideoStage } from '@/entities/video';
import type { Crumb, NoteScope } from '@/shared/types';

/** Состояние и действия страницы этапа */
export interface UseVideoStagePageResult {
  projectId: string;
  crumbs: Crumb[];
  canEdit: boolean;
  canWork: boolean;
  isPending: boolean;
  /** Этап; undefined - нет такого этапа у видео */
  stage: VideoStage | undefined;
  /** Подпись места этапа в видео: "Этап 2 из 5" */
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
