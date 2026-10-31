import type { ReactNode } from 'react';
import { PlanRow } from '@/widgets/plan';
import { PostRow, VideoPostRow } from '@/widgets/posts';
import type { MyPlanRowProps } from '../types/my-plan';

/** Строка задачи, этапа или публикации проекта */
export function MyPlanRow({
  entry,
  bucket,
  onOpen,
}: MyPlanRowProps): ReactNode {
  const onRowOpen = (): void => onOpen(entry.id);
  let row: ReactNode;

  if (entry.kind === 'work') {
    row = (
      <PlanRow
        item={entry.item}
        bucket={bucket}
        projectId={entry.project.id}
        canWork={entry.canWork}
        onOpen={onRowOpen}
      />
    );
  } else if (entry.kind === 'music') {
    row = <PostRow post={entry.post} songs={entry.songs} onOpen={onRowOpen} />;
  } else {
    const account =
      entry.project.links?.find((link) => link.id === entry.post.account)
        ?.name ?? 'Аккаунт';
    row = (
      <VideoPostRow
        post={entry.post}
        accountName={account}
        videoTitle={entry.videoTitle}
        onOpen={onRowOpen}
      />
    );
  }

  return row;
}
