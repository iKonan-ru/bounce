import { toast } from 'sonner';
import { getCollection, pb, Collections, queryKeys } from '@/shared/api';
import { useFieldUpload } from '@/shared/hooks';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  AVATAR_FIELD,
  AVATAR_THUMBS,
  AVATAR_REMOVE_PATCH,
} from '../constants/project-settings';
import type {
  ProjectAvatarEditorProps,
  UseProjectAvatarEditorResult,
} from '../types/project-settings';

/** Загрузка и удаление картинки проекта (только владелец) */
export function useProjectAvatarEditor({
  project,
  isOwner,
}: ProjectAvatarEditorProps): UseProjectAvatarEditorResult {
  const queryClient = useQueryClient();
  const saveProject = useMutation({
    mutationFn: (patch: FormData | Record<string, string>) =>
      getCollection(pb, Collections.Projects).update(project.id, patch),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
    onError: () =>
      toast.error('Не сохранилось: проверьте соединение и размер картинки'),
  });
  const avatar = useFieldUpload({
    record: project,
    field: AVATAR_FIELD,
    thumbs: AVATAR_THUMBS,
    refresh: queryKeys.projects.all,
  });

  const handleAvatarRemove = (): void => {
    saveProject.mutate(AVATAR_REMOVE_PATCH);
  };

  if (!isOwner) {
    return {
      onAvatarPick: undefined,
      onAvatarRemove: undefined,
      pendingAvatar: avatar.pending,
    };
  }

  return {
    onAvatarPick: avatar.pick,
    onAvatarRemove: handleAvatarRemove,
    pendingAvatar: avatar.pending,
  };
}
