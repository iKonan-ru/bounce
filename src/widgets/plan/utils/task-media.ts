import type { Song } from '@/entities/song';
import type { Task } from '@/entities/task';
import type { Video } from '@/entities/video';
import type { MenuOption } from '@/shared/types';
import { PROJECT_TASK_MEDIA } from '../constants/task-media';

/** Тип медиа входит в значение: id песни и видео могут совпадать */
export function getTaskMediaValue(task: Pick<Task, 'song' | 'video'>): string {
  if (task.song) {
    return `song:${task.song}`;
  }

  return task.video ? `video:${task.video}` : PROJECT_TASK_MEDIA;
}

/** Обе связи меняются одним запросом, прежняя всегда очищается */
export function getTaskMediaPatch(value: string): Pick<Task, 'song' | 'video'> {
  const [kind, id = ''] = value.split(':');

  return {
    song: kind === 'song' ? id : '',
    video: kind === 'video' ? id : '',
  };
}

/** Название непосредственного медиа; связь видео с песней не меняет контекст задачи */
export function getTaskMediaTitle(
  task: Pick<Task, 'song' | 'video'>,
  songs: readonly Pick<Song, 'id' | 'title'>[],
  videos: readonly Pick<Video, 'id' | 'title'>[]
): string {
  if (task.song) {
    return songs.find((song) => song.id === task.song)?.title ?? 'Песня';
  }

  if (task.video) {
    return videos.find((video) => video.id === task.video)?.title ?? 'Видео';
  }

  return '';
}

/** Песни и видео разделены; пояснение отличает одинаковые названия */
export function getTaskMediaOptions(
  songs: readonly Pick<Song, 'id' | 'title'>[],
  videos: readonly Pick<Video, 'id' | 'title'>[]
): MenuOption<string>[] {
  return [
    { value: PROJECT_TASK_MEDIA, label: 'Проекту целиком' },
    ...songs.map((song, index) => ({
      value: `song:${song.id}`,
      label: song.title,
      hint: 'Песня',
      isSeparated: index === 0,
    })),
    ...videos.map((video, index) => ({
      value: `video:${video.id}`,
      label: video.title,
      hint: 'Видео',
      isSeparated: index === 0,
    })),
  ];
}
