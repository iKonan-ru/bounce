import type { TaskStage } from '@/entities/project-task';
import type { SongStage, Song, Substep, StageStatus } from '@/entities/song';
import type { Video, VideoStage } from '@/entities/video';

/** Пропсы окна этапа из плана */
interface StageDialogBase {
  stage: SongStage | VideoStage | TaskStage;
  projectId: string;
  /** Можно править этап */
  canWork: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** У этапа есть ровно один источник: песня или видео */
export type StageDialogProps = StageDialogBase &
  (
    | { song: Song; video?: never; isTasks?: false }
    | { video: Video; song?: never; isTasks?: false }
    | { isTasks: true; song?: never; video?: never }
  );

/** Пункт чек-листа из редактора подэтапов: отметка может быть не задана */
export interface ChecklistItem extends Pick<Substep, 'id' | 'title'> {
  done?: boolean;
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
  stageLink:
    | {
        to: '/p/$projectId/tasks/stages/$stageId';
        params: { projectId: string; stageId: string };
      }
    | {
        to: '/p/$projectId/songs/$songId/stages/$stageId';
        params: { projectId: string; songId: string; stageId: string };
      }
    | {
        to: '/p/$projectId/videos/$videoId/stages/$stageId';
        params: { projectId: string; videoId: string; stageId: string };
      };
  onStatusChange: (status: StageStatus) => void;
  onAssigneesChange: (assignees: string[]) => void;
  onDeadlineChange: (deadline: string) => void;
  onSubstepsChange: (items: ChecklistItem[]) => void;
  onDoneClick: () => void;
}
