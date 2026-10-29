import type { ReactNode } from 'react';
import { parseMarkup, cn } from '@/shared/utils';
import type { MarkupProps } from '../types/markup';
import { BlockView } from './block-view';

/** Текст заметки с разметкой (lib/markup.ts) */
export function Markup({ text, className }: MarkupProps): ReactNode {
  const blocks = parseMarkup(text);
  const markupClassName = cn('flex flex-col gap-2 break-words', className);

  return (
    <div className={markupClassName}>
      {blocks.map((block, index) => (
        // ключ - позиция: блоки разбираются заново при каждой правке
        <BlockView key={index} block={block} />
      ))}
    </div>
  );
}
