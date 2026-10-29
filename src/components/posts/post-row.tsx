import { MentionText } from '@/components/mentions';
import { AvatarStack } from '@/components/people-picker';
import { Due } from '@/components/plan-bits';
import { ServiceIcon } from '@/components/service-icon';
import { dateLabel } from '@/lib/format';
import type { Post, Song } from '@/lib/model';
import { peopleById, useProjectPeople } from '@/lib/people';
import { bucketOf } from '@/lib/plan';
import { offsetLabel, POST_STATUS_DOT, postDate } from '@/lib/posts';
import { POST_PLATFORMS, serviceById } from '@/lib/services';
import { POST_STATUS_LABEL } from '@/lib/statuses';
import { cn } from '@/lib/utils';

// цвет статуса публикации
export function PostStatusDot({ post }: { post: Pick<Post, 'status'> }) {
  return (
    <span
      aria-hidden="true"
      className={cn('size-2.5 shrink-0 rounded-full', POST_STATUS_DOT[post.status])}
    />
  );
}

function Platforms({ ids, className }: { ids: ReadonlyArray<string>; className?: string }) {
  if (ids.length === 0) return null;
  return (
    <span className={cn('flex items-center gap-1', className)}>
      {ids.flatMap((id) => {
        const s = serviceById(POST_PLATFORMS, id);
        return s ? [<ServiceIcon key={id} service={s} className="size-3.5" />] : [];
      })}
    </span>
  );
}

// Строка публикации: статус, что выкладываем, площадки, песня, когда и кто.
export function PostRow({
  post,
  songs,
  onOpen,
  showSong = true,
}: {
  post: Post;
  songs: ReadonlyArray<Song>;
  onOpen: () => void;
  showSong?: boolean;
}) {
  const people = peopleById(useProjectPeople(post.project));
  const song = post.song ? songs.find((s) => s.id === post.song) : undefined;
  const date = postDate(post, songs);
  const bucket = bucketOf(date, new Date());
  const assignees = (post.assignees ?? []).flatMap((id) => people.get(id) ?? []);
  const when = post.anchor === 'release' ? offsetLabel(post.offset ?? 0) : '';
  const meta = [showSong ? song?.title : '', when, POST_STATUS_LABEL[post.status]].filter(Boolean);
  const published = post.status === 'published';

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-groove/30"
    >
      <span className="flex size-6 shrink-0 items-center justify-center">
        <PostStatusDot post={post} />
      </span>
      <span className="flex min-h-9 min-w-0 flex-1 flex-col justify-center">
        <span className={cn('text-pretty', published && 'text-dim')}>
          <MentionText text={post.title} />
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-dim">
          <Platforms ids={post.platforms ?? []} />
          <span className="truncate">{meta.join(' · ')}</span>
        </span>
      </span>
      {!published && <Due due={date} bucket={bucket} />}
      {published && date && (
        <span className="shrink-0 text-xs text-dim tabular-nums">{dateLabel(date)}</span>
      )}
      <AvatarStack users={assignees} />
    </button>
  );
}
