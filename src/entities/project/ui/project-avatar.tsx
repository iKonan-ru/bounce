import type { ReactNode } from 'react';
import { useFileUrl } from '@/shared/hooks';
import { ImageSlot } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { PROJECT_AVATAR_THUMB } from '../constants/project-avatar';
import type { ProjectAvatarProps } from '../types/project-avatar';

/**
 * Аватар проекта: загруженная картинка или плашка с первой буквой названия
 *
 * isInteractive - по пустой загрузка
 */
export function ProjectAvatar({
  project,
  className,
  onPick,
  pending,
  isInteractive,
  canReplace = false,
  onRemove,
}: ProjectAvatarProps): ReactNode {
  const fileUrl = useFileUrl();
  const avatarClassName = cn('size-10 rounded-lg font-semibold', className);
  const file = project.avatar || undefined;
  const initial = project.name.trim().charAt(0).toUpperCase();
  const letter = <span className="font-semibold text-ink">{initial}</span>;

  if (isInteractive) {
    return (
      <ImageSlot
        record={project}
        file={file}
        thumb={PROJECT_AVATAR_THUMB}
        title={project.name}
        onPick={onPick}
        pending={pending}
        canZoom={false}
        canReplace={canReplace}
        onRemove={onRemove}
        placeholder={letter}
        className={avatarClassName}
      />
    );
  }

  const url = fileUrl(project, file, PROJECT_AVATAR_THUMB);
  const staticClassName = cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden bg-groove',
    avatarClassName
  );

  return (
    <span aria-hidden="true" className={staticClassName}>
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        letter
      )}
    </span>
  );
}
