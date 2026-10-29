import type { ReactNode } from 'react';
import { useProjectGuard } from '@/hooks/use-project-guard';
import { Navigate, Outlet } from '@tanstack/react-router';

/** Проекта нет или доступ к нему закрыли - к списку проектов */
export function ProjectGuard(): ReactNode {
  const { isGone } = useProjectGuard();

  if (isGone) {
    return <Navigate to="/projects" />;
  }

  return <Outlet />;
}
