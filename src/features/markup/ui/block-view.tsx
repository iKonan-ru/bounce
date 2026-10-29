import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { BlockKind } from '@/shared/types';
import type { LinesProps, BlockViewProps } from '../types/markup';
import { InlineNodes } from './inline-nodes';

/** Строки абзаца или цитаты через перенос строки */
function Lines({ lines }: LinesProps): ReactNode {
  return lines.map((line, index) => {
    const hasBreakBefore = index > 0;

    return (
      // ключ - позиция: строки абзаца идут по порядку
      <Fragment key={index}>
        {hasBreakBefore && <br />}
        <InlineNodes nodes={line} />
      </Fragment>
    );
  });
}

/** Блок текста: абзац, список, нумерованный список или цитата */
export function BlockView({ block }: BlockViewProps): ReactNode {
  switch (block.kind) {
    case BlockKind.Paragraph:
      return (
        <p>
          <Lines lines={block.lines} />
        </p>
      );
    case BlockKind.List:
      return (
        <ul className="list-disc space-y-0.5 pl-5 marker:text-dim">
          {block.items.map((listItem, index) => (
            // ключ - позиция: пункты идут по порядку
            <li key={index}>
              <InlineNodes nodes={listItem} />
            </li>
          ))}
        </ul>
      );
    case BlockKind.OrderedList:
      return (
        <ol
          start={block.start}
          className="list-decimal space-y-0.5 pl-6 marker:text-dim"
        >
          {block.items.map((listItem, index) => (
            // ключ - позиция: пункты идут по порядку
            <li key={index}>
              <InlineNodes nodes={listItem} />
            </li>
          ))}
        </ol>
      );
    case BlockKind.Quote:
      return (
        <blockquote className="border-l-2 border-dim/40 pl-3 text-dim">
          <Lines lines={block.lines} />
        </blockquote>
      );
    default:
      return null;
  }
}
