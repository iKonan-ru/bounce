import type { VideoPostsResponse, PromoTemplatesResponse } from '@/shared/api';

export type VideoPost = VideoPostsResponse;

/** Общие поля публикации и видеопромо-шаблона */
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

export type VideoPromo = PromoTemplatesResponse<string[]>;
