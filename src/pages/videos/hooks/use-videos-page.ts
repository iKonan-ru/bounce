import { toast } from 'sonner';
import { useAccess, projectQuery, ProjectDirection } from '@/entities/project';
import { videosQuery } from '@/entities/video';
import {
  pb,
  getCollection,
  Collections,
  queryKeys,
  getErrorText,
  savePositions,
} from '@/shared/api';
import { moveItemById } from '@/shared/utils';
import { useProjectCrumbs } from '@/widgets/page-crumbs';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';

/** Список видео и создание карточки только по названию */
export function useVideosPage() {
  const { projectId } = useParams({ from: '/app/p/$projectId/videos' });
  const project = useQuery(projectQuery(projectId));
  const query = useQuery(videosQuery(projectId));
  const access = useAccess(projectId);
  const client = useQueryClient();
  const navigate = useNavigate();
  const crumbs = useProjectCrumbs(projectId);
  const videos = query.data ?? [];
  const isEnabled = project.data?.directions.includes(ProjectDirection.video);
  const refresh = (): Promise<void> =>
    client.invalidateQueries({ queryKey: queryKeys.videos.all });
  const add = useMutation({
    mutationFn: (title: string) =>
      getCollection(pb, Collections.Videos).create({
        project: projectId,
        title,
        status: 'not_started',
        position: (videos[0]?.position ?? 1) - 1,
      }),
    onSuccess: async (video) => {
      await refresh();
      await navigate({
        to: '/p/$projectId/videos/$videoId',
        params: { projectId, videoId: video.id },
      });
    },
    onError: (error) => toast.error(getErrorText(error, 'Видео не добавлено')),
  });
  const onAdd = (title: string): Promise<unknown> => add.mutateAsync(title);
  const onReorder = (from: string, to: string): void => {
    void savePositions(pb, Collections.Videos, moveItemById(videos, from, to))
      .then(refresh)
      .catch(() => toast.error('Порядок не сохранен'));
  };

  return {
    project: project.data,
    projectId,
    videos,
    crumbs,
    canEdit: access.canEdit,
    isPending: query.isPending,
    isError: query.isError,
    isEnabled,
    isAdding: add.isPending,
    onAdd,
    onReorder,
  };
}
