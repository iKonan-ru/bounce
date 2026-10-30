import type { ReactNode } from 'react';
import { Checkbox, Label } from '@/shared/ui';
import { useProjectDirections } from '../hooks/use-project-directions';
import type { ProjectDirectionsProps } from '../types/directions';

/** Направления: видео недоступно до выпуска его карточек, музыку выбирают явно */
export function ProjectDirections({
  value,
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
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Направления проекта</legend>
      <div className="rounded-xl border bg-console p-3">
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
        <p id={musicHintId} className="mt-1 text-sm text-dim">
          {isReadOnly
            ? 'Нельзя отключить единственное направление проекта.'
            : 'Песни, этапы работы и заметки.'}
        </p>
      </div>
      <div className="rounded-xl border bg-console p-3">
        <Label htmlFor={videoId} className="flex min-h-8 gap-3 text-sm">
          <Checkbox
            id={videoId}
            checked={false}
            disabled
            aria-describedby={videoHintId}
          />
          Видео
        </Label>
        <p id={videoHintId} className="mt-1 text-sm text-dim">
          Будет доступно после добавления раздела видео.
        </p>
      </div>
    </fieldset>
  );
}
