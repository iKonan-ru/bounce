import type { ReactNode } from 'react';
import { PlanRow } from '@/widgets/plan';
import { PostRow, VideoPostRow } from '@/widgets/posts';
import { Link } from '@tanstack/react-router';
import type { MyPlanRowProps } from '../types/my-plan';

/** Название проекта видно до открытия исходной задачи */
export function MyPlanRow({
  entry,
  bucket,
  onOpen,
  showProject = true,
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

  return (
    <div>
      {showProject && (
        <Link
          to="/p/$projectId"
          params={{ projectId: entry.project.id }}
          className="mx-4 mt-3 block truncate text-xs text-dim hover:text-ink"
        >
          {entry.project.name}
        </Link>
      )}
      {row}
    </div>
  );
}
