import { useState, type ReactNode } from 'react';
import { ProjectDirection } from '@/entities/project';
import { ProjectHeader } from '@/features/project-header';
import { PageActionsContext } from '@/shared/ui';
import { Navigate, Outlet } from '@tanstack/react-router';
import { useProjectGuard } from '../hooks/use-project-guard';

/** Проекта нет или доступ к нему закрыли - к списку проектов */
export function ProjectGuard(): ReactNode {
  const { isGone, projectId, project, isMaterialList, direction } =
    useProjectGuard();
  const [actionsTarget, setActionsTarget] = useState<HTMLDivElement | null>(
    null
  );

  if (isGone) {
    return <Navigate to="/projects" />;
  }

  if (!isMaterialList) {
    return <Outlet />;
  }

  return (
    <PageActionsContext value={actionsTarget}>
      <ProjectHeader projectId={projectId} project={project} />
      {project && (
        <div className="mb-6 flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">
            {direction === ProjectDirection.music ? 'Музыка' : 'Видео'}
          </h2>
          <div ref={setActionsTarget} />
        </div>
      )}
      <div
        key={direction}
        className="motion-material-panel flex flex-1 flex-col"
      >
        <Outlet />
      </div>
    </PageActionsContext>
  );
}
