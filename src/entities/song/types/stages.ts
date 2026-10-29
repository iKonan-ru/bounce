import type { SongStage } from './song';

/** Правка этапа песни */
export type StagePatch = Partial<
  Pick<SongStage, 'status' | 'substeps' | 'deadline' | 'title' | 'assignees'>
>;
