import { useAccess } from '@/entities/project';
import { songsQuery } from '@/entities/song';
import type { Task } from '@/entities/task';
import { videosQuery } from '@/entities/video';
import { useQuery } from '@tanstack/react-query';
import { PROJECT_TASK_MEDIA } from '../constants/task-media';
import { getTaskMediaOptions, getTaskMediaValue } from '../utils/task-media';

/** Один выбор контекста в создании и редактировании; отключенные направления не загружаются */
export function useTaskMedia(
  projectId: string,
  task?: Pick<Task, 'song' | 'video'>
) {
  const access = useAccess(projectId);
  const songs = useQuery({
    ...songsQuery(projectId),
    enabled: access.isMusicEnabled,
  });
  const videos = useQuery({
    ...videosQuery(projectId),
    enabled: access.isVideoEnabled,
  });
  const options = getTaskMediaOptions(
    access.isMusicEnabled ? (songs.data ?? []) : [],
    access.isVideoEnabled ? (videos.data ?? []) : []
  );
  const value = task ? getTaskMediaValue(task) : PROJECT_TASK_MEDIA;

  // До загрузки списка сохраненная связь не должна выглядеть общей задачей.
  if (!options.some((option) => option.value === value)) {
    options.push({
      value,
      label: task?.song ? 'Песня' : 'Видео',
      isSeparated: true,
    });
  }

  return { options, hasMedia: options.length > 1, value };
}
