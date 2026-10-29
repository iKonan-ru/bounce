import type { ReactNode } from 'react';

/** Пропсы строки свойства */
export interface PropRowProps {
  label: string;
  children: ReactNode;
  className?: string;
}
