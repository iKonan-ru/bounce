import { useEffect, useState, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { toast } from 'sonner';
import { useProjectPeople, PeopleKind } from '@/entities/project';
import { videosQuery } from '@/entities/video';
import type { VideoPost } from '@/entities/video-post';
import {
  Collections,
  getCollection,
  pb,
  queryKeys,
  getErrorText,
} from '@/shared/api';
import { MAX_IMAGE_BYTES } from '@/shared/constants';
import { useMe } from '@/shared/hooks';
import { shrinkImage } from '@/shared/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PublicationDialogProps } from '../types/publishing';
import { usePublicationFields } from './use-publication-fields';

/** Сохранение целиком; отказ не закрывает форму и не теряет выбранное превью */
export function usePublicationDialog(props: PublicationDialogProps) {
  const { projectId, post, onClose, canWork } = props;
  const form = usePublicationFields(projectId, post);
  const me = useMe();
  const client = useQueryClient();
  const videos = useQuery(videosQuery(projectId));
  const [videoId, setVideoId] = useState(post?.video ?? props.videoId ?? '');
  const [status, setStatus] = useState<VideoPost['status']>(
    post?.status ?? 'idea'
  );
  const [assignee, setAssignee] = useState(post?.assignees ?? '');
  const [url, setUrl] = useState(post?.url ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onPickPreview = (): void => fileInputRef.current?.click();
  const [file, setFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [isPreviewRemoved, setIsPreviewRemoved] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showDetails, setShowDetails] = useState(
    Boolean(post?.text || post?.preview || post?.url || post?.assignees)
  );
  const people = useProjectPeople(
    projectId,
    PeopleKind.Workers,
    assignee ? [assignee] : []
  );
  useEffect(() => {
    if (!file) {
      setPreviewUrl(undefined);

      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  const refresh = async (): Promise<void> => {
    await Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.videoPosts.all }),
      client.invalidateQueries({ queryKey: queryKeys.videos.all }),
    ]);
  };
  const onError = (error: unknown): void => {
    toast.error(getErrorText(error, 'Публикация не сохранена'));
  };
  const save = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      for (const [key, value] of Object.entries({
        ...form.fields,
        title: form.fields.title.trim(),
        status,
        assignees: assignee,
        url,
      })) {
        body.set(key, String(value));
      }

      if (file) {
        const image = await shrinkImage(file);

        if (image.size > MAX_IMAGE_BYTES) {
          throw new Error('Превью должно быть не больше 20 МБ.');
        }

        body.set('preview', image);
      } else if (isPreviewRemoved) {
        body.set('preview', '');
      }

      const collection = getCollection(pb, Collections.VideoPosts);

      if (post) {
        return collection.update(post.id, body);
      }

      body.set('project', projectId);
      body.set('video', videoId);
      body.set('author', me?.id ?? '');

      return collection.create(body);
    },
    onSuccess: async () => {
      await refresh();
      onClose();
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: () =>
      getCollection(pb, Collections.VideoPosts).delete(post?.id ?? ''),
    onSuccess: async () => {
      await refresh();
      onClose();
    },
    onError,
  });
  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();

    if (form.canSave && videoId && canWork && !save.isPending) {
      save.mutate();
    }
  };
  const onStatusChange = (value: string): void =>
    setStatus(value as VideoPost['status']);
  const onUrlChange = (event: ChangeEvent<HTMLInputElement>): void =>
    setUrl(event.target.value);
  const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setFile(event.target.files?.[0]);
    setIsPreviewRemoved(false);
  };
  const onPreviewRemove = (): void => {
    setFile(undefined);
    setIsPreviewRemoved(true);
  };
  const onDetailsToggle = (): void => setShowDetails(!showDetails);
  const onRemove = (): void => setIsConfirming(true);
  const onRemoveConfirm = (): void => remove.mutate();

  return {
    ...form,
    videoId,
    status,
    assignee,
    url,
    previewUrl,
    fileInputRef,
    onPickPreview,
    isPreviewRemoved,
    showDetails,
    isConfirming,
    setIsConfirming,
    videoOptions: [
      { value: '', label: 'Выбрать видео' },
      ...(videos.data ?? []).map((video) => ({
        value: video.id,
        label: video.title,
      })),
    ],
    peopleOptions: [
      { value: '', label: 'Никто' },
      ...people.map((user) => ({ value: user.id, label: user.name })),
    ],
    isBusy: save.isPending || remove.isPending,
    canSubmit: form.canSave && Boolean(videoId) && canWork && !save.isPending,
    setVideoId,
    setAssignee,
    onStatusChange,
    onUrlChange,
    onFileChange,
    onPreviewRemove,
    onDetailsToggle,
    onSubmit,
    onRemove,
    onRemoveConfirm,
  };
}
