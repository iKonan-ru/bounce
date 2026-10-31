import type { ReactNode } from 'react';
import { Loading } from '@/shared/ui';
import { Navigate } from '@tanstack/react-router';
import { useProjectEntry } from '../hooks/use-project-entry';

/** Общий адрес проекта открывает выбранное направление без лишней записи в истории */
export function ProjectEntry(): ReactNode {
  const { projectId, target, isError } = useProjectEntry();

  if (isError) {
    return (
      <p className="text-led-red">
        Проект не удалось загрузить. Обновите страницу.
      </p>
    );
  }

  if (!target) {
    return <Loading className="h-40 rounded-xl" />;
  }

  return <Navigate to={target} params={{ projectId }} replace />;
}
