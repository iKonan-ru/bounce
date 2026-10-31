import type { ReactNode } from 'react';
import {
  SEGMENTED_GROUP,
  SEGMENTED_ITEM,
  SEGMENTED_ACTIVE,
} from '@/shared/constants';
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
    SEGMENTED_ITEM,
    current === ProjectDirection.music ? SEGMENTED_ACTIVE : 'text-dim'
  );
  const videoClassName = cn(
    SEGMENTED_ITEM,
    current === ProjectDirection.video ? SEGMENTED_ACTIVE : 'text-dim'
  );
  const musicAriaCurrent =
    current === ProjectDirection.music ? 'page' : undefined;
  const videoAriaCurrent =
    current === ProjectDirection.video ? 'page' : undefined;
  const params = { projectId: project.id };
  const groupClassName = cn(SEGMENTED_GROUP, 'inline-flex');

  return (
    <nav aria-label="Направление" className={groupClassName}>
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
