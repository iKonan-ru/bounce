import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useAccess, projectQuery, ProjectDirection } from '@/entities/project';
import type { Video } from '@/entities/video';
import { videosQuery } from '@/entities/video';
import { pb, Collections, savePositions, queryKeys } from '@/shared/api';
import { moveItemById } from '@/shared/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { VIDEO_FILTERS } from '../constants/videos';
import type { VideoFilter } from '../types/videos';

/** Список видео и создание карточки только по названию */
export function useVideosPage() {
  const { projectId } = useParams({ from: '/app/p/$projectId/videos' });
  const project = useQuery(projectQuery(projectId));
  const query = useQuery(videosQuery(projectId));
  const access = useAccess(projectId);
  const client = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const onCreate = (): void => setIsCreating(true);
  const onClose = (): void => setIsCreating(false);
  const videos = query.data ?? [];
  const isEnabled = project.data?.directions.includes(ProjectDirection.video);
  const [filter, setFilter] = useState<VideoFilter>('all');
  const [orderingVideos, setOrderingVideos] = useState<Video[] | null>(null);
  const orderingVideosRef = useRef(orderingVideos);
  orderingVideosRef.current = orderingVideos;
  const listRef = useRef<HTMLDivElement>(null);
  const orderToggleRef = useRef<HTMLButtonElement>(null);
  const isOrdering = orderingVideos !== null;

  // useCallback нужен для корректности: функция - зависимость эффектов ниже, и с новой ссылкой
  // на каждой отрисовке эффект ухода со страницы применял бы порядок при каждой отрисовке
  const handleOrderApply = useCallback((): void => {
    const ordered = orderingVideosRef.current;
    setOrderingVideos(null);

    if (!ordered) {
      return;
    }

    const isUnchanged = ordered.every(
      (video, index) => video.position === index
    );

    if (isUnchanged) {
      return;
    }

    orderingVideosRef.current = null;
    const queryKey = videosQuery(projectId).queryKey;
    const previous = client.getQueryData(queryKey);
    client.setQueryData(
      queryKey,
      ordered.map((video, position) => ({ ...video, position }))
    );
    void savePositions(pb, Collections.Videos, ordered)
      .catch(() => {
        client.setQueryData(queryKey, previous);
        toast.error('Порядок не сохранился: проверьте соединение');
      })
      .finally(() =>
        client.invalidateQueries({ queryKey: queryKeys.videos.all })
      );
  }, [client, projectId]);

  useEffect(() => {
    if (!isOrdering) {
      return;
    }

    const onDocumentPointerDown = (event: PointerEvent): void => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      const isInList = listRef.current?.contains(target);
      const isOnToggle = orderToggleRef.current?.contains(target);
      const isInside = isInList || isOnToggle;

      if (isInside) {
        return;
      }

      handleOrderApply();
    };
    const onDocumentKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        handleOrderApply();
      }
    };
    document.addEventListener('pointerdown', onDocumentPointerDown);
    document.addEventListener('keydown', onDocumentKeyDown);

    return (): void => {
      document.removeEventListener('pointerdown', onDocumentPointerDown);
      document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [isOrdering, handleOrderApply]);

  // ушли со страницы, не нажав "Готово" - порядок всё равно сохраняется
  useEffect(
    () => (): void => {
      handleOrderApply();
    },
    [handleOrderApply]
  );

  const visibleVideos =
    orderingVideos ??
    videos.filter((video) => filter === 'all' || video.status === filter);
  const filterCounts = VIDEO_FILTERS.map((option) => ({
    ...option,
    count: videos.filter(
      (video) => option.value === 'all' || video.status === option.value
    ).length,
  })).filter((option) => option.value === 'all' || option.count > 0);
  const onOrderToggle = (): void => {
    if (isOrdering) {
      handleOrderApply();

      return;
    }

    setFilter('all');
    setOrderingVideos(videos);
  };
  const onReorder = (from: string, to: string): void => {
    setOrderingVideos((current) =>
      current ? moveItemById(current, from, to) : current
    );
  };

  return {
    project: project.data,
    projectId,
    videos,
    visibleVideos,
    filter,
    filterCounts,
    onFilterSelect: setFilter,
    isOrdering,
    canOrder: access.canEdit && videos.length > 1,
    listRef,
    orderToggleRef,
    onOrderToggle,
    canEdit: access.canEdit,
    isPending: query.isPending,
    isError: query.isError,
    isEnabled,
    isCreating,
    onCreate,
    onClose,
    onReorder,
  };
}
