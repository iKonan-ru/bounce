import type { ReactNode } from 'react';
import type { Post } from '@/entities/post';
import type { PlanGroup } from '@/shared/types';

/** Пропсы контент-плана */
export interface ContentPlanProps {
  projectId: string;
  meId: string | undefined;
  /** Id исполнителя: только его публикации ("На мне"); без него - все */
  assigneeId: string | undefined;
  canWork: boolean;
}

/** Состояние и обработчики контент-плана */
export interface UseContentPlanResult {
  groups: PlanGroup<Post>[];
  published: Post[];
  openedPost: Post | undefined;
  isLoading: boolean;
  showEmpty: boolean;
  emptyText: string;
  renderPost: (post: Post) => ReactNode;
  onPostCreated: (post: Post) => void;
  onDialogOpenChange: (isOpen: boolean) => void;
}
