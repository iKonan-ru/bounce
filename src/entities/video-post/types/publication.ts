import type { VideoPostsResponse } from '@/shared/api';

export type VideoPost = VideoPostsResponse;

/** Поля самостоятельной видеопубликации */
export interface PublicationFields {
  title: string;
  text: string;
  account: string;
  anchor: 'date' | 'main';
  date: string;
  time: string;
  timezone: string;
  offset: number;
}
