import { useContext, type PropsWithChildren, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PageActionsContext } from './page-actions-context';

/** Действия текущей страницы в общей шапке раздела. */
export function PageActions({ children }: PropsWithChildren): ReactNode {
  const target = useContext(PageActionsContext);

  return target ? createPortal(children, target) : null;
}
