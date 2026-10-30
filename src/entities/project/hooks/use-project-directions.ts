import { useId } from 'react';
import { ProjectDirection } from '../types/directions';
import type { ProjectDirectionsProps } from '../types/directions';

/** Минимум одно направление; заполненное направление нельзя снять */
export function useProjectDirections({
  value,
  onChange,
  disabled = false,
  blockers,
}: ProjectDirectionsProps) {
  const id = useId();
  const hasMusic = value.includes(ProjectDirection.music);
  const hasVideo = value.includes(ProjectDirection.video);
  const isLast = value.length === 1;
  const isReadOnly = !onChange;
  const isMusicDisabled =
    disabled ||
    isReadOnly ||
    (hasMusic && (isLast || Boolean(blockers?.music)));
  const isVideoDisabled =
    disabled ||
    isReadOnly ||
    (hasVideo && (isLast || Boolean(blockers?.video)));
  const change = (
    direction: ProjectDirection,
    checked: boolean | 'indeterminate'
  ): void => {
    onChange?.(
      checked === true
        ? [...value, direction]
        : value.filter((item) => item !== direction)
    );
  };
  const onMusicChange = (checked: boolean | 'indeterminate'): void =>
    change(ProjectDirection.music, checked);
  const onVideoChange = (checked: boolean | 'indeterminate'): void =>
    change(ProjectDirection.video, checked);

  return {
    musicId: `${id}-music`,
    videoId: `${id}-video`,
    hasMusic,
    hasVideo,
    isLast,
    isMusicDisabled,
    isVideoDisabled,
    onMusicChange,
    onVideoChange,
  };
}
