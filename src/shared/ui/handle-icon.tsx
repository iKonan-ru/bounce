import { GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';

/** Значок ручки с подсветкой при наведении */
export function HandleIcon(): ReactNode {
  return (
    <span className="flex h-7 w-5 items-center justify-center rounded-md transition-colors group-hover/handle:bg-groove group-hover/handle:text-ink">
      <GripVertical className="size-4" />
    </span>
  );
}
