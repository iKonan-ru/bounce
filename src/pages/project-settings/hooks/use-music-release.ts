import { toast } from 'sonner';
import {
  pb,
  getCollection,
  Collections,
  queryKeys,
  getErrorText,
} from '@/shared/api';
import { SAVE_FAILED } from '@/shared/constants';
import { useIsOnline } from '@/shared/hooks';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import type {
  MusicReleaseProps,
  UseMusicReleaseResult,
} from '../types/music-release';

/** Сохраняет режим выпуска сразу после переключения */
export function useMusicRelease({
  project,
  isOwner,
}: MusicReleaseProps): UseMusicReleaseResult {
  const client = useQueryClient();
  const isOnline = useIsOnline();
  const save = useMutation({
    mutationFn: (enabled: boolean) =>
      getCollection(pb, Collections.Projects).update(project.id, {
        music_release_enabled: enabled,
      }),
    onSettled: () =>
      client.invalidateQueries({ queryKey: queryKeys.projects.all }),
    onError: (error) => toast.error(getErrorText(error, SAVE_FAILED)),
  });
  const isDisabled = !isOwner || save.isPending || !isOnline;
  const onChange = (checked: boolean | 'indeterminate'): void => {
    if (!isDisabled) {
      save.mutate(checked === true);
    }
  };

  return {
    isEnabled: save.isPending
      ? save.variables
      : project.music_release_enabled === true,
    isDisabled,
    onChange,
  };
}
