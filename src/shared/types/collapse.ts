import type { ReactNode } from 'react';

/** Пропсы раскрывающегося блока */
export interface CollapseProps {
  /** Блок раскрыт */
  isOpen: boolean;
  children: ReactNode;
}
