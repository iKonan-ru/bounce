import type { ReactNode } from 'react';
import { GROUP_ROWS } from '@/shared/constants';
import { Checkbox, Label } from '@/shared/ui';
import { Link } from '@tanstack/react-router';
import { useProjectDirections } from '../hooks/use-project-directions';
import type { ProjectDirectionsProps } from '../types/directions';

/** Общий блок направлений; пояснения только для недоступного действия */
export function ProjectDirections(props: ProjectDirectionsProps): ReactNode {
  const state = useProjectDirections(props);

  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Направления проекта</legend>
      <div className={GROUP_ROWS}>
        <div className="px-4 py-3">
          <Label htmlFor={state.musicId} className="flex min-h-8 gap-3 text-sm">
            <Checkbox
              id={state.musicId}
              checked={state.hasMusic}
              disabled={state.isMusicDisabled}
              onCheckedChange={state.onMusicChange}
            />
            Музыка
          </Label>
          {state.hasMusic && props.blockers?.music && (
            <p className="mt-1 pl-7 text-sm text-dim">
              {props.blockers.music.message}{' '}
              <Link
                {...props.blockers.music.link}
                className="underline underline-offset-2"
              >
                Открыть
              </Link>
            </p>
          )}
          {state.hasMusic && props.children && (
            <div className="mt-3 ml-7 rounded-lg bg-console p-3">
              {props.children}
            </div>
          )}
        </div>
        <div className="px-4 py-3">
          <Label htmlFor={state.videoId} className="flex min-h-8 gap-3 text-sm">
            <Checkbox
              id={state.videoId}
              checked={state.hasVideo}
              disabled={state.isVideoDisabled}
              onCheckedChange={state.onVideoChange}
            />
            Видео
          </Label>
          {state.hasVideo && props.blockers?.video && (
            <p className="mt-1 pl-7 text-sm text-dim">
              {props.blockers.video.message}{' '}
              <Link
                {...props.blockers.video.link}
                className="underline underline-offset-2"
              >
                Открыть
              </Link>
            </p>
          )}
        </div>
      </div>
    </fieldset>
  );
}
