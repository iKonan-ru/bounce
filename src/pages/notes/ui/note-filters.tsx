import type { ReactNode } from 'react';
import { NoteLevel } from '@/entities/note';
import { ContentDirection } from '@/shared/types';
import { Checkbox, MenuSelect, PropRow } from '@/shared/ui';
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
          align="start"
          label="Направление заметок"
          className="max-w-full"
          options={directionOptions}
          value={filter.direction}
          onChange={onDirectionChange}
        />
      </PropRow>
      <PropRow label="Где">
        <MenuSelect
          align="start"
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
            align="start"
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
            align="start"
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
          align="start"
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
          align="start"
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
