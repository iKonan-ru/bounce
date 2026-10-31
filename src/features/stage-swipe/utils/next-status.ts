import { StageStatus } from '@/entities/song';

/** Свайп продвигает этап вперед, но не открывает завершенные этапы заново */
export function getNextStageStatus(status: StageStatus): StageStatus | null {
  if (status === StageStatus.not_started) {
    return StageStatus.in_progress;
  }

  if (status === StageStatus.in_progress) {
    return StageStatus.done;
  }

  return null;
}
