import { useState } from 'react';
import { toast } from 'sonner';
import { postsQuery, PostStatus } from '@/entities/post';
import { songsQuery, SongStatus, checkIsReleaseDue } from '@/entities/song';
import {
  pb,
  getCollection,
  Collections,
  queryKeys,
  getErrorText,
} from '@/shared/api';
import { SAVE_FAILED } from '@/shared/constants';
import { useIsOnline } from '@/shared/hooks';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type {
  MusicReleaseProps,
  UseMusicReleaseResult,
} from '../types/music-release';

/** Сначала показываем последствия, затем сохраняем настройку владельца */
export function useMusicRelease({
  project,
}: MusicReleaseProps): UseMusicReleaseResult {
  const client = useQueryClient();
  const isOnline = useIsOnline();
  const [nextEnabled, setNextEnabled] = useState<boolean | null>(null);
  const isConfirming = nextEnabled !== null;
  const posts = useQuery({ ...postsQuery(project.id), enabled: isConfirming });
  const songs = useQuery({ ...songsQuery(project.id), enabled: isConfirming });
  const save = useMutation({
    mutationFn: (enabled: boolean) =>
      getCollection(pb, Collections.Projects).update(project.id, {
        music_release_enabled: enabled,
      }),
    onSuccess: () => setNextEnabled(null),
    onSettled: () =>
      client.invalidateQueries({ queryKey: queryKeys.projects.all }),
    onError: (error) => toast.error(getErrorText(error, SAVE_FAILED)),
  });
  const isEnabled = project.music_release_enabled === true;
  const pendingCount = (posts.data ?? []).filter(
    (post) => post.status !== PostStatus.published
  ).length;
  const dueCount = (songs.data ?? []).filter(
    (song) =>
      song.status === SongStatus.sent && checkIsReleaseDue(song.target_release)
  ).length;
  const title = nextEnabled
    ? 'Включить выпуск и продвижение?'
    : 'Выключить выпуск и продвижение?';
  let description = `Релизы, музыкальные ссылки и промо будут скрыты, автоматический выпуск остановится. Все данные сохранятся. Незавершенных публикаций: ${pendingCount}.`;

  if (nextEnabled) {
    description = `Релизы, ссылки и промо снова станут доступны. Автоматический выпуск возобновится. Отправленных песен с наступившей датой релиза: ${dueCount}. Они получат статус "Выпущена". Публикации автоматически не отмечаются опубликованными.`;
  }

  const hasLoadError = posts.isError || songs.isError;
  const isLoading = [
    posts.isPending,
    songs.isPending,
    posts.isFetching,
    songs.isFetching,
  ].some(Boolean);
  const isConfirmDisabled = [
    save.isPending,
    isLoading,
    hasLoadError,
    !isOnline,
  ].some(Boolean);

  if (isLoading) {
    description = 'Проверяем публикации и даты релизов...';
  }

  if (hasLoadError || !isOnline) {
    description =
      'Не удалось проверить публикации и даты релизов. Закройте окно и повторите попытку при подключении к сети.';
  }

  const onChange = (checked: boolean | 'indeterminate'): void => {
    setNextEnabled(checked === true);
  };
  const onOpenChange = (open: boolean): void => {
    if (!open && !save.isPending) {
      setNextEnabled(null);
    }
  };
  const onConfirm = (): void => {
    if (nextEnabled !== null && !isConfirmDisabled) {
      save.mutate(nextEnabled);
    }
  };

  return {
    isEnabled,
    isConfirming,
    isSaving: save.isPending,
    isConfirmDisabled,
    title,
    description,
    onChange,
    onOpenChange,
    onConfirm,
  };
}
