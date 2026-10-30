import type { ReactNode } from 'react';
import { GROUP_ROWS } from '@/shared/constants';
import { Checkbox, Label } from '@/shared/ui';
import { useProjectDirections } from '../hooks/use-project-directions';
import type { ProjectDirectionsProps } from '../types/directions';

/** Направления: видео недоступно до выпуска его карточек, музыку выбирают явно */
export function ProjectDirections({
  value,
  children,
  onChange,
  disabled = false,
}: ProjectDirectionsProps): ReactNode {
  const {
    musicId,
    musicHintId,
    videoId,
    videoHintId,
    isReadOnly,
    isMusicDisabled,
    hasMusic,
    onMusicChange,
  } = useProjectDirections({ value, onChange, disabled });

  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Направления проекта</legend>
      <div className={GROUP_ROWS}>
        <div className="px-4 py-3">
          <Label htmlFor={musicId} className="flex min-h-8 gap-3 text-sm">
            <Checkbox
              id={musicId}
              checked={hasMusic}
              disabled={isMusicDisabled}
              onCheckedChange={onMusicChange}
              aria-describedby={musicHintId}
            />
            Музыка
          </Label>
          <p id={musicHintId} className="mt-1 pl-7 text-sm text-dim">
            {isReadOnly
              ? 'Нельзя отключить единственное направление проекта.'
              : 'Песни, этапы работы и заметки.'}
          </p>
          {hasMusic && children && (
            <div className="mt-3 ml-7 rounded-lg bg-console p-3">
              {children}
            </div>
          )}
        </div>
        <div className="px-4 py-3">
          <Label htmlFor={videoId} className="flex min-h-8 gap-3 text-sm">
            <Checkbox
              id={videoId}
              checked={false}
              disabled
              aria-describedby={videoHintId}
            />
            Видео
          </Label>
          <p id={videoHintId} className="mt-1 pl-7 text-sm text-dim">
            Будет доступно после добавления раздела видео.
          </p>
        </div>
      </div>
    </fieldset>
  );
}
