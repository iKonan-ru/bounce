import { useId } from 'react';
import type { ReactNode } from 'react';
import { Label, Switch } from '@/shared/ui';
import type { MusicReleaseToggleProps } from '../types/music-release-toggle';

/** Дополнительная возможность музыкального направления */
export function MusicReleaseToggle({
  checked,
  onCheckedChange,
  disabled = false,
}: MusicReleaseToggleProps): ReactNode {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div>
      <div className="flex min-h-10 items-center justify-between gap-4">
        <Label htmlFor={id} className="flex-1 leading-snug">
          Выпуск и продвижение песен
        </Label>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-describedby={hintId}
        />
      </div>
      <p id={hintId} className="mt-1 text-sm text-dim">
        Релизы, музыкальные площадки и промо-план.
      </p>
    </div>
  );
}
