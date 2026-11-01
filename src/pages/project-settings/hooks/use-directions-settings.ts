import { toast } from 'sonner';
import { DIRECTION_PATHS } from '@/entities/project';
import type {
  Project,
  ProjectDirection,
  DirectionBlocker,
} from '@/entities/project';
import {
  pb,
  getCollection,
  Collections,
  queryKeys,
  getErrorText,
} from '@/shared/api';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type { DirectionsBlockersResponse } from '../types/directions-settings';

/** Причины запрета приходят с сервера без сведений о закрытых заметках */
export function useDirectionsSettings(project: Project, isOwner: boolean) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.projects.directions(project.id),
    queryFn: () =>
      pb.send<DirectionsBlockersResponse>(
        `/api/bounce/projects/${project.id}/directions`,
        { method: 'GET' }
      ),
    enabled: isOwner,
    staleTime: 0,
  });
  const save = useMutation({
    mutationFn: (directions: ProjectDirection[]) =>
      getCollection(pb, Collections.Projects).update(project.id, {
        directions,
      }),
    onSettled: () =>
      client.invalidateQueries({ queryKey: queryKeys.projects.all }),
    onError: (error) =>
      toast.error(getErrorText(error, 'Направления не сохранены')),
  });
  const blockers: Partial<Record<ProjectDirection, DirectionBlocker>> = {};
  for (const direction of project.directions) {
    const blocker = query.data?.[direction];

    if (!blocker) {
      continue;
    }

    let to:
      | '/p/$projectId/songs'
      | '/p/$projectId/videos'
      | '/p/$projectId/tasks'
      | '/p/$projectId/settings'
      | '/p/$projectId/plan' = '/p/$projectId/settings';
    let hash =
      blocker.target === 'links'
        ? `${direction}-links`
        : `${direction}-templates`;

    if (blocker.target === 'release') {
      hash = 'music';
    }

    if (blocker.target === 'cards') {
      to = DIRECTION_PATHS[direction];
      hash = '';
    }

    if (blocker.target === 'posts') {
      to = '/p/$projectId/plan';
      hash = '';
    }

    blockers[direction] = {
      message: blocker.message,
      link: { to, params: { projectId: project.id }, hash },
    };
  }
  const onChange = (directions: ProjectDirection[]): void =>
    save.mutate(directions);

  return {
    blockers,
    onChange: isOwner ? onChange : undefined,
    isDisabled: save.isPending || (isOwner && !query.isSuccess),
    hasError: query.isError,
  };
}
