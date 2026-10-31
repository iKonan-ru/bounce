import { useState } from 'react';
import type { Post } from '@/entities/post';
import { ProjectDirection } from '@/entities/project';
import type { MyPlanComposerProps } from '../types/my-plan';

/** Создание задачи или публикации в текущем проекте */
export function useMyPlanComposer({
  projects,
  projectId,
}: MyPlanComposerProps) {
  const [kind, setKind] = useState('task');
  const [post, setPost] = useState<Post>();
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const project = projects.find((item) => item.id === projectId);
  const hasMusic =
    project?.music_release_enabled &&
    project.directions.includes(ProjectDirection.music);
  const hasVideo =
    project?.directions.includes(ProjectDirection.video) &&
    project.links?.some((link) =>
      link.directions.includes(ProjectDirection.video)
    );
  const options = [
    { value: 'task', label: 'Задача' },
    ...(hasMusic ? [{ value: 'music', label: 'Публикация песни' }] : []),
    ...(hasVideo ? [{ value: 'video', label: 'Публикация видео' }] : []),
  ];
  const currentKind = options.some((option) => option.value === kind)
    ? kind
    : 'task';
  const onPostOpenChange = (open: boolean): void => {
    if (!open) {
      setPost(undefined);
    }
  };
  const accessiblePost = projects.some(
    (item) =>
      item.id === post?.project &&
      item.music_release_enabled &&
      item.directions.includes(ProjectDirection.music)
  )
    ? post
    : undefined;
  const onVideoOpen = (): void => setIsVideoOpen(true);
  const onVideoClose = (): void => setIsVideoOpen(false);

  return {
    project,
    currentKind,
    setKind,
    options,
    post: accessiblePost,
    setPost,
    onPostOpenChange,
    isVideoOpen,
    onVideoOpen,
    onVideoClose,
  };
}
