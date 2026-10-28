import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Раскрывающийся блок: высота плавно растёт от нуля. Свёрнутый не получает фокус.
export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      inert={!open}
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-200 ease-out-soft',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
