import { Disc3 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Project, Song } from '@/lib/model';
import { getMainCover } from '@/lib/songs';
import { SLOT_CLASS_NAME } from '@/shared/constants';
import { useFileUrl } from '@/shared/hooks';
import type { PendingImage } from '@/shared/types';
import { ImageSlot } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { SongCoverSize } from './sizes';

/** Пропсы аватара проекта */
interface ProjectAvatarProps {
  project: Project;
  className?: string;
  onPick?: ((file: File) => void) | undefined;
  pending?: PendingImage | undefined;
  /** По пустой - загрузка */
  isInteractive?: boolean;
  /** Загруженную картинку заменить нажатием */
  canReplace?: boolean;
  /** Крестик над картинкой: убрать её */
  onRemove?: (() => void) | undefined;
}

/** Пропсы обложки песни */
interface SongCoverProps {
  song: Song;
  size?: SongCoverSize;
  className?: string;
  onPick?: ((file: File) => void) | undefined;
  pending?: PendingImage | undefined;
  /** Шапка песни: по пустой - загрузка, загруженная открывается на весь экран */
  isInteractive?: boolean;
}

/** Размер уменьшенной копии аватара проекта */
const PROJECT_AVATAR_THUMB = '256x256';

/** Уменьшенная копия обложки песни по размеру */
const SONG_COVER_THUMB: Record<SongCoverSize, string> = {
  [SongCoverSize.Small]: '96x96',
  [SongCoverSize.Large]: '600x600',
};

/** Значок пластинки без обложки по размеру */
const SONG_COVER_ICON_CLASS_NAME: Record<SongCoverSize, string> = {
  [SongCoverSize.Small]: 'size-5',
  [SongCoverSize.Large]: 'size-10',
};

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

/**
 * Основная обложка песни; без обложки - значок пластинки
 *
 * interactive (шапка песни) - по пустой загрузка, загруженная открывается на весь экран
 */
export function SongCover({
  song,
  size = SongCoverSize.Small,
  className,
  onPick,
  pending,
  isInteractive,
}: SongCoverProps): ReactNode {
  const fileUrl = useFileUrl();
  const file = getMainCover(song);
  const isLarge = size === SongCoverSize.Large;
  const coverClassName = cn(
    {
      'size-20 rounded-xl md:size-28': isLarge,
      'size-12 rounded-lg': !isLarge,
    },
    className
  );
  const thumb = SONG_COVER_THUMB[size];
  const iconClassName = SONG_COVER_ICON_CLASS_NAME[size];
  const placeholder = <Disc3 className={iconClassName} strokeWidth={1.5} />;

  if (isInteractive) {
    return (
      <ImageSlot
        record={song}
        file={file}
        thumb={thumb}
        title={song.title}
        onPick={onPick}
        pending={pending}
        placeholder={placeholder}
        className={coverClassName}
      />
    );
  }

  const url = fileUrl(song, file, thumb);
  const staticClassName = cn(SLOT_CLASS_NAME, coverClassName);

  return (
    <span aria-hidden="true" className={staticClassName}>
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        placeholder
      )}
    </span>
  );
}
