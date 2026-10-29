// Формы JSON-полей: PocketBase их не проверяет, пишет их только приложение.
import type { PostsResponse, PromoTemplatesResponse } from '@/shared/api';
import { PostsStatusOptions, PostsAnchorOptions } from '@/shared/api';

export type Post = PostsResponse<string[]>;

/** Публикация промо-плана проекта: offset - дней до (минус) или после релиза */
export type PromoStep = PromoTemplatesResponse<string[]>;

// Значения полей-списков из схемы PocketBase: объекты значений и их типы генерирует pnpm typegen,
// поэтому это не enum, а те же объекты под понятными именами. Запись с сервера приходит со
// строкой этого типа, и свой enum пришлось бы приводить к ней через as.

/** Статус публикации */
export const PostStatus = PostsStatusOptions;

export type PostStatus = PostsStatusOptions;

/** Дата публикации: своя или от даты релиза песни */
export const PostAnchor = PostsAnchorOptions;

export type PostAnchor = PostsAnchorOptions;
