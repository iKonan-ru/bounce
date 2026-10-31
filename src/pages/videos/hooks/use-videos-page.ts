import { useState } from 'react';
import { toast } from 'sonner';
import { useAccess, projectQuery, ProjectDirection } from '@/entities/project';
import { videosQuery } from '@/entities/video';
import { pb, Collections, queryKeys, savePositions } from '@/shared/api';
import { moveItemById } from '@/shared/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';

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
  const refresh = (): Promise<void> =>
    client.invalidateQueries({ queryKey: queryKeys.videos.all });
  const onReorder = (from: string, to: string): void => {
    void savePositions(pb, Collections.Videos, moveItemById(videos, from, to))
      .then(refresh)
      .catch(() => toast.error('Порядок не сохранен'));
  };

  return {
    project: project.data,
    projectId,
    videos,
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
