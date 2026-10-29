import type { QueryRoot } from './query-keys';

/** Корни ключей с оптимистичными правками (shared/api/query-keys.ts): песни (с этапами), задачи, публикации */
export type EditRoot = QueryRoot.Songs | QueryRoot.Tasks | QueryRoot.Posts;
