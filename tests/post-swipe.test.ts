import { describe, expect, it } from 'vitest';
import { PostStatus } from '@/entities/post';
import { getNextPostStatus } from '../src/widgets/posts/utils/next-status';

describe('следующий статус публикации по свайпу', () => {
  it.each([
    [PostStatus.idea, PostStatus.preparing],
    [PostStatus.preparing, PostStatus.ready],
    [PostStatus.ready, PostStatus.published],
    [PostStatus.published, null],
  ])('%s → %s', (current, next) => {
    expect(getNextPostStatus(current as PostStatus)).toBe(next);
  });
});
