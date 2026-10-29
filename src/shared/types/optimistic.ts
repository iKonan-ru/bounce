import type { QueryRoot } from './query-keys';

/** Корни ключей с оптимистичными правками (lib/query-keys.ts): песни (с этапами), задачи, публикации */
export type EditRoot = QueryRoot.Songs | QueryRoot.Tasks | QueryRoot.Posts;
