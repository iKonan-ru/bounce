import type { ReactNode } from 'react';
import { useMe } from '@/shared/hooks';
import { Avatar, Logo } from '@/shared/ui';
import { Link } from '@tanstack/react-router';

/** Профиль всегда доступен сверху и не меняет состав нижнего меню */
export function MobileProfile(): ReactNode {
  const me = useMe();

  return (
    <div className="mb-4 flex min-h-9 items-center justify-between md:hidden">
      <Link to="/projects" aria-label="Проекты" className="text-dim">
        <Logo className="size-6" />
      </Link>
      <Link
        to="/me"
        aria-label="Профиль"
        className="flex size-10 items-center justify-center rounded-full"
      >
        <Avatar user={me ?? undefined} className="size-7 text-xs" />
      </Link>
    </div>
  );
}
