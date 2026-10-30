import type { Post } from '@/entities/post';
import type { VideoPost } from '@/entities/video-post';

/** Пропсы контент-плана */
export interface ContentPlanProps {
  projectId: string;
  meId: string | undefined;
  /** Id исполнителя: только его публикации ("На мне"); без него - все */
  assigneeId: string | undefined;
  canWork: boolean;
}

/** Разные коллекции могут иметь одинаковые id, в списке используется префикс */
export type ContentPlanItem =
  | { id: string; kind: 'music'; post: Post }
  | { id: string; kind: 'video'; post: VideoPost };
