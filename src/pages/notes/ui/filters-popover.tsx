import { SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Popover,
  PopoverTrigger,
  Button,
  PopoverContent,
  Segmented,
  Checkbox,
} from '@/shared/ui';
import {
  LEVEL_OPTIONS,
  SELECT_CLASS_NAME,
  SORT_OPTIONS,
} from '../constants/notes';
import type { FiltersPopoverProps } from '../types/notes';

/** Кнопка "Фильтры" и окно с ними: где, песня, автор, картинки и порядок */
export function FiltersPopover({
  filter,
  sort,
  songs,
  people,
  chipsCount,
  onLevelChange,
  onSongChange,
  onAuthorChange,
  onImagesCheckedChange,
  onSortChange,
  onResetClick,
}: FiltersPopoverProps): ReactNode {
  const hasChips = chipsCount > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 gap-2 md:h-9">
          <SlidersHorizontal className="size-4" />
          <span className="max-sm:sr-only">Фильтры</span>
          {hasChips && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {chipsCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-80 flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-dim">Где</span>
          <Segmented
            label="Где"
            options={LEVEL_OPTIONS}
            value={filter.level}
            onChange={onLevelChange}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-song" className="text-sm text-dim">
            Песня
          </label>
          <select
            id="filter-song"
            value={filter.song}
            onChange={onSongChange}
            className={SELECT_CLASS_NAME}
          >
            <option value="">Любая</option>
            {songs?.map((song) => (
              <option key={song.id} value={song.id}>
                {song.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-author" className="text-sm text-dim">
            Автор
          </label>
          <select
            id="filter-author"
            value={filter.author}
            onChange={onAuthorChange}
            className={SELECT_CLASS_NAME}
          >
            <option value="">Любой</option>
            {people.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <label
          htmlFor="filter-images"
          className="flex min-h-9 cursor-pointer items-center gap-3"
        >
          <Checkbox
            id="filter-images"
            className="size-5"
            checked={filter.hasImages}
            onCheckedChange={onImagesCheckedChange}
          />
          Только с картинками
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-dim">Порядок</span>
          <Segmented
            label="Порядок"
            options={SORT_OPTIONS}
            value={sort}
            onChange={onSortChange}
          />
        </div>
        {hasChips && (
          <Button
            variant="ghost"
            className="self-start text-dim"
            onClick={onResetClick}
          >
            Сбросить фильтры
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
