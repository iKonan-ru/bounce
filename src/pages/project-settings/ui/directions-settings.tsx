import { useId } from 'react';
import type { ReactNode } from 'react';
import { ProjectDirection } from '@/entities/project';
import { GROUP_ROWS } from '@/shared/constants';
import { Label, Switch } from '@/shared/ui';
import { Link } from '@tanstack/react-router';
import { useDirectionsSettings } from '../hooks/use-directions-settings';
import type { DirectionSettingsProps } from '../types/directions-settings';
import { MusicRelease } from './music-release';

/** Направление включается там же, где находятся его настройки */
export function DirectionsSettings({
  project,
  isOwner,
  direction,
}: DirectionSettingsProps): ReactNode {
  const id = useId();
  const { blockers, onChange, isDisabled, hasError } = useDirectionsSettings(
    project,
    isOwner
  );
  const isEnabled = project.directions.includes(direction);
  const blocker = isEnabled ? blockers[direction] : undefined;
  const isLast = isEnabled && project.directions.length === 1;
  const label = direction === ProjectDirection.music ? 'Музыка' : 'Видео';
  const onCheckedChange = (checked: boolean): void => {
    onChange?.(
      checked
        ? [...project.directions, direction]
        : project.directions.filter((item) => item !== direction)
    );
  };

  return (
    <div className={GROUP_ROWS}>
      <div className="px-4 py-3">
        <div className="flex min-h-6 items-center justify-between gap-4">
          <Label htmlFor={id}>{label}</Label>
          <Switch
            id={id}
            checked={isEnabled}
            disabled={!isOwner || isDisabled || isLast || Boolean(blocker)}
            onCheckedChange={onCheckedChange}
            aria-describedby={blocker ? `${id}-reason` : undefined}
          />
        </div>
        {blocker && (
          <p id={`${id}-reason`} className="mt-2 text-sm text-dim">
            {blocker.message}{' '}
            <Link {...blocker.link} className="underline underline-offset-2">
              Открыть
            </Link>
          </p>
        )}
        {hasError && (
          <p className="mt-2 text-sm text-led-red">
            Не удалось проверить наполнение. Обновите страницу.
          </p>
        )}
      </div>
      {isEnabled && direction === ProjectDirection.music && (
        <div className="bg-console/50 px-4 py-3">
          <MusicRelease project={project} isOwner={isOwner} />
        </div>
      )}
    </div>
  );
}
