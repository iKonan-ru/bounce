import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Пропсы раскрывающегося блока */
interface CollapseProps {
  /** Блок раскрыт */
  isOpen: boolean;
  children: ReactNode;
}

/** Раскрывающийся блок: высота плавно растёт от нуля; свёрнутый не получает фокус */
export function Collapse({ isOpen, children }: CollapseProps): ReactNode {
  const collapseClassName = cn(
    'grid transition-[grid-template-rows,opacity] duration-200 ease-out-soft',
    {
      'grid-rows-[1fr] opacity-100': isOpen,
      'grid-rows-[0fr] opacity-0': !isOpen,
    }
  );

  return (
    <div inert={!isOpen} className={collapseClassName}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
