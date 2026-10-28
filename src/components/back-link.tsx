import { Link, type LinkProps } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

export function BackLink({ children, ...props }: LinkProps & { children: ReactNode }) {
  return (
    <Link
      {...props}
      className="-ml-1 mb-4 inline-flex min-h-8 items-center gap-1 py-1 text-sm text-dim active:text-ink"
    >
      <ChevronLeft className="size-4" />
      {children}
    </Link>
  );
}
