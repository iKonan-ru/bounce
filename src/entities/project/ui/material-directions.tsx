import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';
import { Link } from '@tanstack/react-router';
import type { MaterialDirectionsProps } from '../types/directions';
import { ProjectDirection } from '../types/directions';

/** Направления равноправны; при единственном направлении остается заголовок */
export function MaterialDirections({
  project,
  current,
}: MaterialDirectionsProps): ReactNode {
  const hasBoth = project.directions.length > 1;

  if (!hasBoth) {
    return (
      <h2 className="text-xl font-semibold">
        {current === ProjectDirection.music ? 'Музыка' : 'Видео'}
      </h2>
    );
  }

  const musicClassName = cn(
    'rounded-md px-2 py-2 text-sm sm:px-3 transition-colors',
    current === ProjectDirection.music
      ? 'bg-panel text-ink shadow-sm'
      : 'text-dim'
  );
  const videoClassName = cn(
    'rounded-md px-2 py-2 text-sm sm:px-3 transition-colors',
    current === ProjectDirection.video
      ? 'bg-panel text-ink shadow-sm'
      : 'text-dim'
  );
  const musicAriaCurrent =
    current === ProjectDirection.music ? 'page' : undefined;
  const videoAriaCurrent =
    current === ProjectDirection.video ? 'page' : undefined;
  const params = { projectId: project.id };

  return (
    <nav
      aria-label="Направление"
      className="inline-flex gap-1 rounded-lg bg-groove p-1"
    >
      <Link
        to="/p/$projectId/songs"
        params={params}
        className={musicClassName}
        aria-current={musicAriaCurrent}
        activeOptions={{ exact: true }}
      >
        Музыка
      </Link>
      <Link
        to="/p/$projectId/videos"
        params={params}
        className={videoClassName}
        aria-current={videoAriaCurrent}
        activeOptions={{ exact: true }}
      >
        Видео
      </Link>
    </nav>
  );
}
