import type { ReactNode } from 'react';
import { Avatar } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { DEFAULT_MAX_AVATARS } from '../constants/people-picker';
import type { AvatarStackProps } from '../types/people-picker';

/** Аватары внахлёст: до трёх, остальные - числом */
export function AvatarStack({
  users,
  className,
  maxCount = DEFAULT_MAX_AVATARS,
  ringClassName = 'ring-panel',
}: AvatarStackProps): ReactNode {
  if (users.length === 0) {
    return null;
  }

  const shownUsers = users.slice(0, maxCount);
  const restCount = users.length - shownUsers.length;
  const hasRest = restCount > 0;
  const names = users.map((user) => user.name).join(', ');
  const stackClassName = cn(
    'flex shrink-0 items-center -space-x-1.5',
    className
  );
  const avatarClassName = cn('size-6 text-[0.625rem] ring-2', ringClassName);
  const restClassName = cn(
    'z-10 flex size-6 items-center justify-center rounded-full bg-groove text-[0.625rem] font-medium ring-2',
    ringClassName
  );

  return (
    <span title={names} className={stackClassName}>
      {shownUsers.map((user, index) => {
        const avatarKey = user.id ?? index;

        return (
          <Avatar key={avatarKey} user={user} className={avatarClassName} />
        );
      })}
      {hasRest && <span className={restClassName}>+{restCount}</span>}
    </span>
  );
}
