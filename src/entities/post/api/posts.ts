// Контент-план: публикации проекта. Дата - обычная (anchor = date) или от даты релиза песни
// (anchor = release, offset - дней до (-) или после (+) релиза): если релиз переносят,
// публикация переезжает вместе с ним.
import type PocketBase from 'pocketbase';
import {
  getCollection,
  Collections,
  applyOptimisticEdit,
  queryKeys,
  pb,
} from '@/shared/api';
import { QueryRoot } from '@/shared/types';
import type { QueryClient } from '@tanstack/react-query';
import type { Post } from '../types/post';
import { PostStatus, PostAnchor } from '../types/post';
import type { NewPost, PostPatch } from '../types/posts';

/** Создать публикацию */
export function createPost(client: PocketBase, input: NewPost): Promise<Post> {
  return getCollection(client, Collections.Posts).create<Post>({
    project: input.project,
    title: input.title.trim(),
    author: input.author,
    song: input.song ?? '',
    status: PostStatus.idea,
    anchor: input.anchor ?? PostAnchor.date,
    date: input.date ?? '',
    offset: input.offset ?? 0,
    assignees: input.assignees ?? [],
    platforms: input.platforms ?? [],
  });
}

/** Правка публикации: сразу в кэше, потом на сервере (lib/optimistic.ts) */
export async function updatePost(
  client: QueryClient,
  post: Pick<Post, 'id' | 'project'>,
  patch: PostPatch
): Promise<void> {
  const patchCachedPost = (cached: Post): Post => {
    if (cached.id !== post.id) {
      return cached;
    }

    return { ...cached, ...patch };
  };
  await applyOptimisticEdit(
    client,
    QueryRoot.Posts,
    () =>
      client.setQueryData<Post[]>(
        queryKeys.posts.ofProject(post.project),
        (list) => list?.map(patchCachedPost)
      ),
    () => getCollection(pb, Collections.Posts).update(post.id, patch)
  );
}
