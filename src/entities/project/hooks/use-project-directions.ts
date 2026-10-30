import { useId } from 'react';
import { ProjectDirection } from '../types/directions';
import type {
  ProjectDirectionsProps,
  UseProjectDirectionsResult,
} from '../types/directions';

/** Подписи и выбор направлений без возможности включить незавершённый раздел */
export function useProjectDirections({
  value,
  onChange,
  disabled = false,
}: ProjectDirectionsProps): UseProjectDirectionsResult {
  const id = useId();
  const musicId = `${id}-music`;
  const musicHintId = `${id}-music-hint`;
  const videoId = `${id}-video`;
  const videoHintId = `${id}-video-hint`;
  const isReadOnly = !onChange;
  const isMusicDisabled = disabled || isReadOnly;
  const hasMusic = value.includes(ProjectDirection.music);

  const onMusicChange = (checked: boolean | 'indeterminate'): void => {
    if (onChange) {
      onChange(checked === true ? [ProjectDirection.music] : []);
    }
  };

  return {
    musicId,
    musicHintId,
    videoId,
    videoHintId,
    isReadOnly,
    isMusicDisabled,
    hasMusic,
    onMusicChange,
  };
}
