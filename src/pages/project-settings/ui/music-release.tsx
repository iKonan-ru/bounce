import type { ReactNode } from 'react';
import { MusicReleaseToggle } from '@/entities/project';
import { useMusicRelease } from '../hooks/use-music-release';
import type { MusicReleaseProps } from '../types/music-release';

/** Выпуск можно выключить без удаления сохраненных релизов и публикаций */
export function MusicRelease({
  project,
  isOwner,
}: MusicReleaseProps): ReactNode {
  const { isEnabled, isDisabled, onChange } = useMusicRelease({
    project,
    isOwner,
  });

  return (
    <>
      <MusicReleaseToggle
        checked={isEnabled}
        disabled={isDisabled}
        onCheckedChange={onChange}
      />
      {!isOwner && (
        <p className="mt-2 text-sm text-dim">
          Настройку меняет владелец проекта.
        </p>
      )}
    </>
  );
}
