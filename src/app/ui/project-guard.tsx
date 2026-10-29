import type { ReactNode } from 'react';
import { Navigate, Outlet } from '@tanstack/react-router';
import { useProjectGuard } from '../hooks/use-project-guard';

/** Проекта нет или доступ к нему закрыли - к списку проектов */
export function ProjectGuard(): ReactNode {
  const { isGone } = useProjectGuard();

  if (isGone) {
    return <Navigate to="/projects" />;
  }

  return <Outlet />;
}
