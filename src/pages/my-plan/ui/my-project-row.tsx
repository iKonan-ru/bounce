import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { ProjectAvatar, ProjectDirection } from '@/entities/project';
import { Link } from '@tanstack/react-router';
import type { MyProjectRowProps } from '../types/my-plan';

/** Обзор проектов; неизвестные счетчики не выдаются за нулевые */
export function MyProjectRow({
  data,
  tasksCount,
  postsCount,
}: MyProjectRowProps): ReactNode {
  const hasPublications =
    data.project.directions.includes(ProjectDirection.video) ||
    data.project.music_release_enabled;
  const parts = [`Дела: ${tasksCount}`];

  if (hasPublications) {
    parts.push(`Публикации: ${postsCount}`);
  }

  const summary = data.isIncomplete ? '' : parts.join(' / ');

  return (
    <Link
      to="/p/$projectId/plan"
      params={{ projectId: data.project.id }}
      className="flex items-center gap-3 px-4 py-3 hover:bg-groove/30"
    >
      <ProjectAvatar project={data.project} className="size-10" />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{data.project.name}</span>
        <span className="text-xs text-dim">{summary}</span>
      </span>
      <ChevronRight className="size-4 text-dim" />
    </Link>
  );
}
