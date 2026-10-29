import { ClientResponseError } from 'pocketbase';
import { useEffect } from 'react';
import { projectQuery, forgetProject } from '@/entities/project';
import { syncProject } from '@/features/offline-sync';
import { useIsOnline } from '@/shared/hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';

/** Id маршрута проекта */
const PROJECT_ROUTE_ID = '/app/p/$projectId';

/** Статусы ответа: проекта нет или доступ к нему закрыли */
const PROJECT_GONE_STATUSES: ReadonlySet<number> = new Set([403, 404]);

/** Результат хука охраны проекта */
export interface UseProjectGuardResult {
  /** Проекта нет или доступ к нему закрыли */
  isGone: boolean;
}

/**
 * Проверка проекта: ушёл ли он, и выгрузка его целиком на устройство
 *
 * Без сети ошибка запроса - не повод уходить: проект открывается из сохранённых данных
 */
export function useProjectGuard(): UseProjectGuardResult {
  const { projectId } = useParams({ from: PROJECT_ROUTE_ID });
  const project = useQuery(projectQuery(projectId));
  const queryClient = useQueryClient();
  const isOnline = useIsOnline();
  const isGone =
    project.error instanceof ClientResponseError &&
    PROJECT_GONE_STATUSES.has(project.error.status);

  useEffect(() => {
    if (isGone) {
      forgetProject(projectId);
    }
  }, [isGone, projectId]);

  // проект целиком на устройство - чтобы без сети открывались и страницы, где ещё не были
  useEffect(() => {
    const shouldSync = isOnline && !isGone;

    if (shouldSync) {
      void syncProject(queryClient, projectId);
    }
  }, [queryClient, projectId, isOnline, isGone]);

  return { isGone };
}
