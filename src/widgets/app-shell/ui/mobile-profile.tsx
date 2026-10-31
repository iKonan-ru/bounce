import type { ReactNode } from 'react';
import { useMe } from '@/shared/hooks';
import { Avatar, Logo } from '@/shared/ui';
import { Link } from '@tanstack/react-router';
import type { MobileProfileProps } from '../types/app-shell';

/** Профиль всегда доступен сверху и не меняет состав нижнего меню */
export function MobileProfile({ crumbsRef }: MobileProfileProps): ReactNode {
  const me = useMe();

  return (
    <div className="mb-4 flex min-h-9 items-center gap-2 md:hidden">
      <Link to="/projects" aria-label="Проекты" className="shrink-0 text-dim">
        <Logo className="size-6" />
      </Link>
      <div ref={crumbsRef} className="min-w-0 flex-1" />
      <Link
        to="/me"
        aria-label="Профиль"
        className="flex size-10 shrink-0 items-center justify-center rounded-full"
      >
        <Avatar user={me ?? undefined} className="size-7 text-xs" />
      </Link>
    </div>
  );
}
