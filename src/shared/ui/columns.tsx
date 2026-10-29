import type { ReactNode } from 'react';
import type { ColumnsProps } from '../types/page';

/** Две колонки на широком экране; на телефоне и планшете - одна под другой */
export function Columns({ main, side }: ColumnsProps): ReactNode {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <div className="min-w-0">{main}</div>
      <aside className="min-w-0">{side}</aside>
    </div>
  );
}
