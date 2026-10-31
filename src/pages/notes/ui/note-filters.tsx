import type { ReactNode } from 'react';
import { NoteLevel } from '@/entities/note';
import { ContentDirection } from '@/shared/types';
import { Label, Switch, MenuSelect, PropRow } from '@/shared/ui';
import { SORT_OPTIONS } from '../constants/notes';
import type { NoteFiltersProps } from '../types/notes';

/** Параметры фильтрации и сортировки заметок */
export function NoteFilters({
  filter,
  sort,
  songs,
  videos,
  directionOptions,
  levelOptions,
  onDirectionChange,
  onVideoChange,
  people,
  onLevelChange,
  onSongChange,
  onAuthorChange,
  onImagesCheckedChange,
  onSortChange,
}: NoteFiltersProps): ReactNode {
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
    Boolean(songs) &&
    directionOptions.some(
      (option) => option.value === ContentDirection.Music
    ) &&
    [ContentDirection.All, ContentDirection.Music].includes(filter.direction) &&
    filter.level !== NoteLevel.Project;
  const showVideos =
    Boolean(videos) &&
    directionOptions.some(
      (option) => option.value === ContentDirection.Video
    ) &&
    [ContentDirection.All, ContentDirection.Video].includes(filter.direction) &&
    filter.level !== NoteLevel.Project;

  return (
    <>
      <PropRow label="Направление">
        <MenuSelect
          align="end"
          label="Направление заметок"
          className="max-w-full"
          options={directionOptions}
          value={filter.direction}
          onChange={onDirectionChange}
        />
      </PropRow>
      <PropRow label="Где">
        <MenuSelect
          align="end"
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
            align="end"
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
            align="end"
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
          align="end"
          label="Автор"
          className="max-w-full"
          options={authorOptions}
          value={filter.author}
          onChange={onAuthorChange}
        />
      </PropRow>
      <div className="flex min-h-12 items-center gap-3 px-4 md:min-h-11">
        <Label
          htmlFor="filter-images"
          className="flex-1 text-base font-normal text-dim"
        >
          Только с картинками
        </Label>
        <Switch
          id="filter-images"
          checked={filter.hasImages}
          onCheckedChange={onImagesCheckedChange}
        />
      </div>
      <PropRow label="Порядок">
        <MenuSelect
          align="end"
          label="Порядок заметок"
          className="max-w-full"
          options={SORT_OPTIONS}
          value={sort}
          onChange={onSortChange}
        />
      </PropRow>
    </>
  );
}
