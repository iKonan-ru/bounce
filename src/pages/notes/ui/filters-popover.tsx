import { SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { NoteLevel } from '@/entities/note';
import { ContentDirection } from '@/shared/types';
import {
  Popover,
  PopoverTrigger,
  Button,
  PopoverContent,
  Checkbox,
  MenuSelect,
  PropRow,
} from '@/shared/ui';
import { SORT_OPTIONS } from '../constants/notes';
import type { FiltersPopoverProps } from '../types/notes';

/** Кнопка "Фильтры" и окно с ними: где, песня, автор, картинки и порядок */
export function FiltersPopover({
  filter,
  sort,
  songs,
  videos,
  directionOptions,
  levelOptions,
  onDirectionChange,
  onVideoChange,
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
  const songOptions = [
    { value: '', label: 'Любая' },
    ...(songs ?? []).map((song) => ({ value: song.id, label: song.title })),
  ];
  const videoOptions = [
    { value: '', label: 'Любое' },
    ...(videos ?? []).map((video) => ({ value: video.id, label: video.title })),
  ];
  const authorOptions = [
    { value: '', label: 'Любой' },
    ...people.map((person) => ({ value: person.id, label: person.name })),
  ];
  const showSongs =
    directionOptions.some(
      (option) => option.value === ContentDirection.Music
    ) &&
    [ContentDirection.All, ContentDirection.Music].includes(filter.direction) &&
    filter.level !== NoteLevel.Project;
  const showVideos =
    directionOptions.some(
      (option) => option.value === ContentDirection.Video
    ) &&
    [ContentDirection.All, ContentDirection.Video].includes(filter.direction) &&
    filter.level !== NoteLevel.Project;

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
      <PopoverContent
        align="end"
        className="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3"
      >
        <PropRow label="Направление">
          <MenuSelect
            label="Направление заметок"
            className="max-w-full"
            options={directionOptions}
            value={filter.direction}
            onChange={onDirectionChange}
          />
        </PropRow>
        <PropRow label="Где">
          <MenuSelect
            label="Уровень заметок"
            className="max-w-full"
            options={levelOptions}
            value={filter.level}
            onChange={onLevelChange}
          />
        </PropRow>
        {showSongs && (
          <PropRow label="Песня">
            <MenuSelect
              label="Песня"
              className="max-w-full"
              options={songOptions}
              value={filter.song}
              onChange={onSongChange}
            />
          </PropRow>
        )}
        {showVideos && (
          <PropRow label="Видео">
            <MenuSelect
              label="Видео"
              className="max-w-full"
              options={videoOptions}
              value={filter.video}
              onChange={onVideoChange}
            />
          </PropRow>
        )}
        <PropRow label="Автор">
          <MenuSelect
            label="Автор"
            className="max-w-full"
            options={authorOptions}
            value={filter.author}
            onChange={onAuthorChange}
          />
        </PropRow>
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
        <PropRow label="Порядок">
          <MenuSelect
            label="Порядок заметок"
            className="max-w-full"
            options={SORT_OPTIONS}
            value={sort}
            onChange={onSortChange}
          />
        </PropRow>
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
