import type { FormEvent, ChangeEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { projectTasksQuery } from '@/entities/project-task';
import {
  pb,
  getCollection,
  Collections,
  queryKeys,
  getErrorText,
} from '@/shared/api';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { NewProjectTaskDialogProps } from '../types/new-project-task-dialog';

/** Задача создается по названию, затем открывается его карточка */
export function useNewProjectTaskDialog({
  projectId,
  onClose,
}: NewProjectTaskDialogProps) {
  const [title, setTitle] = useState('');
  const tasks = useQuery(projectTasksQuery(projectId));
  const client = useQueryClient();
  const navigate = useNavigate();
  const create = useMutation({
    mutationFn: () =>
      getCollection(pb, Collections.ProjectTasks).create({
        project: projectId,
        title: title.trim(),
        status: 'not_started',
        position: (tasks.data?.[0]?.position ?? 1) - 1,
      }),
    onSuccess: async (task) => {
      await client.invalidateQueries({ queryKey: queryKeys.projectTasks.all });
      onClose();
      await navigate({
        to: '/p/$projectId/tasks/$taskId',
        params: { projectId, taskId: task.id },
      });
    },
    onError: (error) => toast.error(getErrorText(error, 'Задача не добавлена')),
  });
  const isSubmitDisabled =
    !title.trim() || create.isPending || tasks.isPending || tasks.isError;
  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();

    if (!isSubmitDisabled) {
      create.mutate();
    }
  };
  const onTitleChange = (event: ChangeEvent<HTMLInputElement>): void =>
    setTitle(event.target.value);
  const onOpenChange = (open: boolean): void => {
    if (!open && !create.isPending) {
      onClose();
    }
  };

  return {
    title,
    onTitleChange,
    onSubmit,
    isSubmitDisabled,
    isPending: create.isPending,
    onOpenChange,
  };
}
