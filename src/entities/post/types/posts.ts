import type { Song } from '@/entities/song';
import type { PlanGroup } from '@/shared/types';
import type { Post, PostAnchor } from './post';

/** Новая публикация */
export interface NewPost {
  project: string;
  title: string;
  author: string;
  song?: string;
  anchor?: PostAnchor;
  date?: string;
  offset?: number;
  assignees?: string[];
  platforms?: string[];
}

/** Правка публикации */
export type PostPatch = Partial<
  Pick<
    Post,
    | 'title'
    | 'text'
    | 'status'
    | 'platforms'
    | 'song'
    | 'anchor'
    | 'date'
    | 'offset'
    | 'assignees'
  >
>;

/** Поля публикации, от которых зависит дата выхода */
export type DatedPost = Pick<Post, 'anchor' | 'date' | 'offset' | 'song'>;

/** Даты релиза песен проекта */
export type SongDates = readonly Pick<Song, 'id' | 'target_release'>[];

/** Контент-план: открытые публикации по срокам и опубликованные */
export interface PostGroups<Item> {
  groups: PlanGroup<Item>[];
  published: Item[];
}
