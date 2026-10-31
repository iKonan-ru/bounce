import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';
import type { NavLabelProps } from '../types/app-shell';

/** Подпись пункта: в свёрнутой панели - только для экранного диктора и во всплывающей подсказке */
export function NavLabel({ text, isWide }: NavLabelProps): ReactNode {
  const labelClassName = cn(
    'min-w-0 truncate transition-[opacity,max-width] duration-200 motion-reduce:transition-none',
    {
      'max-w-48 opacity-100': isWide,
      'max-w-0 opacity-0': !isWide,
    }
  );

  return <span className={labelClassName}>{text}</span>;
}
