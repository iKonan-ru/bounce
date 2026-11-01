import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { updateOtherStage } from '@/entities/other';
import { useAccess } from '@/entities/project';
import { updateStage, STAGE_STATUS_LABEL, StageStatus } from '@/entities/song';
import { updateVideoStage } from '@/entities/video';
import {
  getCollection,
  pb,
  Collections,
  queryKeys,
  getErrorText,
} from '@/shared/api';
import { SAVE_FAILED, MOBILE_QUERY } from '@/shared/constants';
import { useMediaQuery } from '@/shared/hooks';
import { useQueryClient } from '@tanstack/react-query';
import type { StageSwipeProps } from '../types/stage-swipe';
import { getNextStageStatus } from '../utils/next-status';

/** Права, сохранение статуса с отменой и подтвержденное удаление */
export function useStageSwipe({
  projectId,
  songId,
  stage,
  isOther = false,
}: StageSwipeProps) {
  const access = useAccess(projectId);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const client = useQueryClient();
  const busy = useRef(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const nextStatus = getNextStageStatus(stage.status);

  const saveStatus = (status: StageStatus): Promise<void> => {
    if (songId) {
      return updateStage(client, songId, stage.id, { status });
    }

    return isOther
      ? updateOtherStage(client, stage.id, { status })
      : updateVideoStage(client, stage.id, { status });
  };
  const sectionCollection = isOther
    ? Collections.OtherStages
    : Collections.VideoStages;
  const sectionKey = isOther ? queryKeys.otherStages.all : queryKeys.videos.all;

  const changeStatus = async (status: StageStatus): Promise<boolean> => {
    if (busy.current || !access.canWork) {
      return false;
    }

    busy.current = true;
    setIsBusy(true);

    try {
      await saveStatus(status);

      return true;
    } catch (error) {
      toast.error(getErrorText(error, SAVE_FAILED));

      return false;
    } finally {
      busy.current = false;
      setIsBusy(false);
    }
  };
  const onAdvance = (): void => {
    if (!nextStatus) {
      return;
    }

    const previous = stage.status;
    const onUndo = (): void => {
      void changeStatus(previous);
    };
    void changeStatus(nextStatus).then((saved) => {
      if (saved) {
        toast(`${stage.title}: ${STAGE_STATUS_LABEL[nextStatus]}`, {
          id: `stage-status-${stage.id}`,
          action: { label: 'Отменить', onClick: onUndo },
        });
      }
    });
  };
  const onDeleteClick = (): void => setIsConfirming(true);
  const onDeleteConfirm = async (): Promise<void> => {
    if (busy.current || !access.canEdit) {
      return;
    }

    busy.current = true;
    setIsBusy(true);

    try {
      await getCollection(
        pb,
        songId ? Collections.SongStages : sectionCollection
      ).delete(stage.id);
      setIsConfirming(false);
      await client.invalidateQueries({
        queryKey: songId ? queryKeys.songs.all : sectionKey,
      });
    } catch (error) {
      toast.error(getErrorText(error, 'Этап не удален'));
    } finally {
      busy.current = false;
      setIsBusy(false);
    }
  };

  return {
    isBusy,
    isConfirming,
    setIsConfirming,
    canAdvance: isMobile && access.canWork && nextStatus !== null && !isBusy,
    canDelete: isMobile && access.canEdit && !isBusy,
    isFinishing: nextStatus === StageStatus.done,
    advanceLabel: nextStatus ? STAGE_STATUS_LABEL[nextStatus] : '',
    onAdvance,
    onDeleteClick,
    onDeleteConfirm,
  };
}
