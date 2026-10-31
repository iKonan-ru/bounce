import type { FormEvent, ChangeEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { videosQuery } from '@/entities/video';
import {
  pb,
  getCollection,
  Collections,
  queryKeys,
  getErrorText,
} from '@/shared/api';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { NewVideoDialogProps } from '../types/new-video-dialog';

/** Видео создается по названию, затем открывается его карточка */
export function useNewVideoDialog({ projectId, onClose }: NewVideoDialogProps) {
  const [title, setTitle] = useState('');
  const videos = useQuery(videosQuery(projectId));
  const client = useQueryClient();
  const navigate = useNavigate();
  const create = useMutation({
    mutationFn: () =>
      getCollection(pb, Collections.Videos).create({
        project: projectId,
        title: title.trim(),
        status: 'not_started',
        position: (videos.data?.[0]?.position ?? 1) - 1,
      }),
    onSuccess: async (video) => {
      await client.invalidateQueries({ queryKey: queryKeys.videos.all });
      onClose();
      await navigate({
        to: '/p/$projectId/videos/$videoId',
        params: { projectId, videoId: video.id },
      });
    },
    onError: (error) => toast.error(getErrorText(error, 'Видео не добавлено')),
  });
  const isSubmitDisabled =
    !title.trim() || create.isPending || videos.isPending || videos.isError;
  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();

    if (!isSubmitDisabled) {
      create.mutate();
    }
  };
  const onTitleChange = (event: ChangeEvent<HTMLInputElement>): void =>
    setTitle(event.target.value);
  const onOpenChange = (open: boolean): void => {
    if (!open && !create.isPending) {
      onClose();
    }
  };

  return {
    title,
    onTitleChange,
    onSubmit,
    isSubmitDisabled,
    isPending: create.isPending,
    onOpenChange,
  };
}
