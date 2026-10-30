import { useState } from 'react';
import { projectQuery, ProjectDirection, useAccess } from '@/entities/project';
import { videoPromoQuery } from '@/entities/video-post';
import { useQuery } from '@tanstack/react-query';

/** Список шаблонов и открытая форма */
export function useVideoPromo(projectId: string) {
  const query = useQuery(videoPromoQuery(projectId));
  const project = useQuery(projectQuery(projectId));
  const access = useAccess(projectId);
  const [openId, setOpenId] = useState<string>();
  const onCreate = (): void => setOpenId('new');
  const onClose = (): void => setOpenId(undefined);
  const getAccountName = (id: string): string =>
    project.data?.links?.find((link) => link.id === id)?.name ?? 'Аккаунт';

  return {
    steps: query.data ?? [],
    template: query.data?.find((step) => step.id === openId),
    openId,
    onOpen: setOpenId,
    onCreate,
    onClose,
    getAccountName,
    hasAccounts: (project.data?.links ?? []).some((link) =>
      link.directions.includes(ProjectDirection.video)
    ),
    isOwner: access.canManage,
    isPending: query.isPending,
    isError: query.isError,
  };
}
