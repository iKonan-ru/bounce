import {
  projectQuery,
  getProjectRole,
  getMaterialDirection,
  getRememberedDirection,
  ProjectDirection,
} from '@/entities/project';
import { useMe } from '@/shared/hooks';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';

/** Сохраненные данные позволяют открыть направление и без сети */
export function useProjectEntry() {
  const { projectId } = useParams({ from: '/app/p/$projectId/' });
  const me = useMe();
  const query = useQuery(projectQuery(projectId));
  const project = query.data;

  if (!project) {
    return { projectId, target: undefined, isError: query.isError };
  }

  if (!getProjectRole(project, me?.id)) {
    return { projectId, target: '/projects' as const, isError: false };
  }

  const direction = getMaterialDirection(
    project,
    getRememberedDirection(me?.id ?? '', projectId)
  );
  const target =
    direction === ProjectDirection.video
      ? ('/p/$projectId/videos' as const)
      : ('/p/$projectId/songs' as const);

  return { projectId, target, isError: false };
}
