import { getProjectPeople, useAccess } from '@/entities/project';
import { Collections, queryKeys } from '@/shared/api';
import { useFieldUpload } from '@/shared/hooks';
import type { FileRecord } from '@/shared/types';
import { AVATAR_FIELD, AVATAR_THUMBS } from '../constants/project-header';
import type { ProjectHeaderProps } from '../types/project-header';

/** Загрузка аватара доступна владельцу независимо от направления */
export function useProjectHeader({ projectId, project }: ProjectHeaderProps) {
  const access = useAccess(projectId);
  const record: FileRecord = project ?? {
    id: projectId,
    collectionId: '',
    collectionName: Collections.Projects,
  };
  const avatar = useFieldUpload({
    record,
    field: AVATAR_FIELD,
    thumbs: AVATAR_THUMBS,
    refresh: queryKeys.projects.all,
  });

  return {
    people: project
      ? getProjectPeople(project).map((person) => person.user)
      : [],
    onAvatarPick: access.canManage ? avatar.pick : undefined,
    pendingAvatar: avatar.pending,
    canEdit: access.canEdit,
  };
}
