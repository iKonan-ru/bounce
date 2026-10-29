import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';
import type { NavLabelProps } from '../types/app-shell';

/** Подпись пункта: в свёрнутой панели - только для экранного диктора и во всплывающей подсказке */
export function NavLabel({ text, isWide }: NavLabelProps): ReactNode {
  const labelClassName = cn('truncate', { 'sr-only': !isWide });

  return <span className={labelClassName}>{text}</span>;
}
