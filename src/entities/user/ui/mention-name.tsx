import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';
import { useQuery } from '@tanstack/react-query';
import { usersQuery } from '../api/queries';
import type { MentionNameProps } from '../types/mentions';

/** Имя вместо @логина; кого нет среди пользователей - логин как есть */
export function MentionName({ username }: MentionNameProps): ReactNode {
  const users = useQuery(usersQuery);
  const user = users.data?.find((candidate) => candidate.username === username);
  const mentionLabel = `@${username}`;
  const hasUser = Boolean(user);
  const nameClassName = cn(
    'rounded-md px-1 py-px font-medium whitespace-nowrap',
    {
      'bg-groove/80 text-ink': hasUser,
      'text-dim': !hasUser,
    }
  );
  const displayName = user ? user.name : mentionLabel;

  return (
    <span title={mentionLabel} className={nameClassName}>
      {displayName}
    </span>
  );
}
