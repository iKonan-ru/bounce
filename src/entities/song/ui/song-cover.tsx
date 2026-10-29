import { Disc3 } from 'lucide-react';
import type { ReactNode } from 'react';
import { SLOT_CLASS_NAME } from '@/shared/constants';
import { useFileUrl } from '@/shared/hooks';
import { ImageSlot } from '@/shared/ui';
import { cn } from '@/shared/utils';
import {
  SONG_COVER_THUMB,
  SONG_COVER_ICON_CLASS_NAME,
} from '../constants/song-cover';
import { SongCoverSize } from '../types/sizes';
import type { SongCoverProps } from '../types/song-cover';
import { getMainCover } from '../utils/songs';

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
