import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { updatePost, PostStatus, POST_STATUS_LABEL } from '@/entities/post';
import { useAccess } from '@/entities/project';
import {
  Collections,
  getCollection,
  pb,
  queryKeys,
  getErrorText,
} from '@/shared/api';
import { MOBILE_QUERY, SAVE_FAILED } from '@/shared/constants';
import { useMediaQuery } from '@/shared/hooks';
import { useQueryClient } from '@tanstack/react-query';
import type { PostSwipeProps } from '../types/post-swipe';
import { getNextPostStatus } from '../utils/next-status';

/** Те же права, что в редакторе публикации; смену статуса можно отменить. */
export function usePostSwipe({ post, isVideo = false }: PostSwipeProps) {
  const access = useAccess(post.project);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const client = useQueryClient();
  const busy = useRef(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const nextStatus = getNextPostStatus(post.status);
  const collection = isVideo ? Collections.VideoPosts : Collections.Posts;
  const refresh = async (): Promise<void> => {
    await client.invalidateQueries({
      queryKey: isVideo ? queryKeys.videoPosts.all : queryKeys.posts.all,
    });

    if (isVideo) {
      await client.invalidateQueries({ queryKey: queryKeys.videos.all });
    }
  };
  const changeStatus = async (status: PostStatus): Promise<boolean> => {
    if (busy.current || !access.canWork) {
      return false;
    }

    busy.current = true;
    setIsBusy(true);
    try {
      if (isVideo) {
        await getCollection(pb, Collections.VideoPosts).update(post.id, {
          status,
        });
        await refresh();
      } else {
        await updatePost(client, post, { status });
      }

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

    const previous = post.status;
    void changeStatus(nextStatus).then((saved) => {
      if (saved) {
        toast(`${post.title}: ${POST_STATUS_LABEL[nextStatus]}`, {
          id: `post-status-${post.id}`,
          action: {
            label: 'Отменить',
            onClick: () => {
              void changeStatus(previous);
            },
          },
        });
      }
    });
  };
  const onDeleteClick = (): void => setIsConfirming(true);
  const onDeleteConfirm = async (): Promise<void> => {
    if (busy.current || !access.canWork) {
      return;
    }

    busy.current = true;
    setIsBusy(true);
    try {
      await getCollection(pb, collection).delete(post.id);
      setIsConfirming(false);
      await refresh();
    } catch (error) {
      toast.error(getErrorText(error, 'Публикация не удалена'));
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
    canDelete: isMobile && access.canWork && !isBusy,
    isFinishing: nextStatus === PostStatus.published,
    advanceLabel: nextStatus ? POST_STATUS_LABEL[nextStatus] : '',
    onAdvance,
    onDeleteClick,
    onDeleteConfirm,
  };
}
