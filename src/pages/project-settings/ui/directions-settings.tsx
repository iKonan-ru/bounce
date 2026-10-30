import type { ReactNode } from 'react';
import { ProjectDirections } from '@/entities/project';
import { useDirectionsSettings } from '../hooks/use-directions-settings';
import type { MusicReleaseProps } from '../types/music-release';
import { MusicRelease } from './music-release';

/** Владелец включает направления, причины запрета показаны рядом с выбором */
export function DirectionsSettings({
  project,
  isOwner,
}: MusicReleaseProps): ReactNode {
  const { blockers, onChange, isDisabled, hasError } = useDirectionsSettings(
    project,
    isOwner
  );

  return (
    <div id="project-directions">
      <ProjectDirections
        value={project.directions}
        onChange={onChange}
        blockers={blockers}
        disabled={isDisabled}
      >
        <MusicRelease project={project} isOwner={isOwner} />
      </ProjectDirections>
      {hasError && (
        <p className="mt-2 text-sm text-led-red">
          Не удалось проверить наполнение. Обновите страницу.
        </p>
      )}
    </div>
  );
}
