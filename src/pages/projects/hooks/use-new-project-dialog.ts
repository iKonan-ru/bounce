import type { FormEvent, ChangeEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Roles, Project, ProjectDirection } from '@/entities/project';
import { createProject } from '@/entities/project';
import { pb, queryKeys } from '@/shared/api';
import { useMe } from '@/shared/hooks';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type {
  NewProjectDialogProps,
  UseNewProjectDialogResult,
} from '../types/projects';

/** Название и участники нового проекта; после создания - переход в проект */
export function useNewProjectDialog(
  onOpenChange: NewProjectDialogProps['onOpenChange']
): UseNewProjectDialogResult {
  const me = useMe();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [roles, setRoles] = useState<Roles>({});
  const [directions, setDirections] = useState<ProjectDirection[]>([]);

  const create = useMutation({
    mutationFn: (): Promise<Project> => {
      if (!me) {
        throw new Error('нет входа');
      }

      return createProject(pb, { name, owner: me.id, roles, directions });
    },
    onSuccess: async (project) => {
      await client.invalidateQueries({ queryKey: queryKeys.projects.all });
      setName('');
      setRoles({});
      setDirections([]);
      await navigate({
        to: '/p/$projectId',
        params: { projectId: project.id },
      });
    },
    onError: () => {
      toast.error('Проект не создан: проверьте соединение');
    },
  });

  const hasName = name.trim() !== '';
  const hasDirections = directions.length > 0;
  const isSubmitDisabled = !hasName || !hasDirections || create.isPending;

  const onFormSubmit = (event: FormEvent): void => {
    event.preventDefault();

    if (!isSubmitDisabled) {
      create.mutate();
    }
  };

  const onNameChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setName(event.target.value);
  };

  const onCancelClick = (): void => {
    onOpenChange(false);
  };

  return {
    ownerId: me?.id,
    name,
    roles,
    setRoles,
    directions,
    setDirections,
    isCreating: create.isPending,
    isSubmitDisabled,
    onNameChange,
    onFormSubmit,
    onCancelClick,
  };
}
