import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AddLinkButtonProps } from '../types/project-links';

/** Одинаковое действие добавления во всех списках ссылок */
export function AddLinkButton({
  label,
  onClick,
}: AddLinkButtonProps): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-dim transition-colors hover:bg-groove/40 hover:text-ink md:min-h-10"
    >
      <Plus className="size-4" />
      {label}
    </button>
  );
}
