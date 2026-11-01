import type { ReactNode } from 'react';
import { getProjectLinks } from '@/entities/service';
import { ProjectLinksBar } from '@/features/project-links';
import { cn } from '@/shared/utils';
import type { LinksSectionProps } from '../types/project';

/** Ссылки проекта; прижаты к низу страницы: короткий список песен их не поднимает */
export function LinksSection({
  project,
  isOrdering,
}: LinksSectionProps): ReactNode {
  const sectionClassName = cn('mt-auto pt-10 transition-opacity', {
    'pointer-events-none opacity-40': isOrdering,
  });

  if (!project) {
    return null;
  }

  const hasLinks = getProjectLinks(project).length > 0;

  if (!hasLinks) {
    return null;
  }

  return (
    <div className={sectionClassName}>
      <ProjectLinksBar project={project} />
    </div>
  );
}
