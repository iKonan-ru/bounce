import { Star, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';
import { useCoverTile } from '../hooks/use-cover-tile';
import type { CoverTileProps } from '../types/song-edit';

/** Плитка обложки: открыть, сделать основной, удалить */
export function CoverTile(props: CoverTileProps): ReactNode {
  const { url, isMain, isBusy } = props;
  const {
    openLabel,
    mainLabel,
    isMainDisabled,
    onViewClick,
    onMainClick,
    onRemoveClick,
  } = useCoverTile(props);
  const tileClassName = cn(
    'relative aspect-square overflow-hidden rounded-lg bg-groove',
    {
      'ring-2 ring-led-amber': isMain,
    }
  );
  const starClassName = cn('size-4', {
    'fill-led-amber text-led-amber': isMain,
  });

  return (
    <div className={tileClassName}>
      <button
        type="button"
        aria-label={openLabel}
        onClick={onViewClick}
        className="block size-full cursor-zoom-in transition-[filter] hover:brightness-95"
      >
        {url && <img src={url} alt="" className="size-full object-cover" />}
      </button>
      <div className="absolute inset-x-1 bottom-1 flex justify-between">
        <button
          type="button"
          aria-label={mainLabel}
          aria-pressed={isMain}
          disabled={isMainDisabled}
          onClick={onMainClick}
          className="flex size-8 items-center justify-center rounded-full bg-black/60 text-white"
        >
          <Star className={starClassName} />
        </button>
        <button
          type="button"
          aria-label="Удалить обложку"
          disabled={isBusy}
          onClick={onRemoveClick}
          className="flex size-8 items-center justify-center rounded-full bg-black/60 text-white"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
