import { useState } from 'react';
import { toast } from 'sonner';
import type { Project } from '@/entities/project';
import { getCollection, pb, Collections, queryKeys } from '@/shared/api';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { UseDeleteProjectResult } from '../types/project-settings';

/** Удаление проекта с подтверждением и переходом к списку проектов */
export function useDeleteProject(project: Project): UseDeleteProjectResult {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(false);
  const removeProject = useMutation({
    mutationFn: () =>
      getCollection(pb, Collections.Projects).delete(project.id),
    onSuccess: async () => {
      setIsConfirming(false);
      await navigate({ to: '/projects' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: () => toast.error('Проект не удалён: проверьте соединение'),
  });

  const onDeleteClick = (): void => {
    setIsConfirming(true);
  };

  const onDeleteConfirm = (): void => {
    removeProject.mutate();
  };

  return {
    isConfirming,
    setIsConfirming,
    isRemoving: removeProject.isPending,
    onDeleteClick,
    onDeleteConfirm,
  };
}
