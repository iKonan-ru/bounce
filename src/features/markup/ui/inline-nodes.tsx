import type { LucideIcon } from 'lucide-react';
import { Link2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { MentionName } from '@/entities/user';
import type { Inline } from '@/shared/types';
import { InlineKind } from '@/shared/types';
import { getLinkLabel } from '@/shared/utils';
import { LINK_ICON_RULES } from '../constants/markup';
import type { InlineNodesProps } from '../types/markup';

/** Значок ссылки по сервису; остальным ссылкам - общий значок */
function getLinkIcon(label: string): LucideIcon {
  const rule = LINK_ICON_RULES.find((linkRule) => linkRule.pattern.test(label));

  if (!rule) {
    return Link2;
  }

  return rule.icon;
}

/** Куски строки; разбираются заново при каждой правке, поэтому ключ - позиция в строке */
export function InlineNodes({ nodes }: InlineNodesProps): ReactNode {
  return nodes.map((node, index) => renderInline(node, index));
}

/** Один кусок строки: текст, оформление, упоминание, код или ссылка */
function renderInline(node: Inline, key: number): ReactNode {
  switch (node.kind) {
    case InlineKind.Text:
      return <Fragment key={key}>{node.text}</Fragment>;
    case InlineKind.Bold:
      return (
        <strong key={key} className="font-semibold">
          <InlineNodes nodes={node.children} />
        </strong>
      );
    case InlineKind.Italic:
      return (
        <em key={key}>
          <InlineNodes nodes={node.children} />
        </em>
      );
    case InlineKind.Underline:
      return (
        <u key={key} className="underline-offset-2">
          <InlineNodes nodes={node.children} />
        </u>
      );
    case InlineKind.Strike:
      return (
        <s key={key} className="text-dim">
          <InlineNodes nodes={node.children} />
        </s>
      );
    case InlineKind.Mention:
      return <MentionName key={key} username={node.username} />;
    case InlineKind.Code:
      return (
        <code
          key={key}
          className="rounded bg-groove px-1 py-0.5 font-mono text-[0.875em]"
        >
          {node.text}
        </code>
      );
    case InlineKind.Link: {
      if (node.children) {
        return (
          <a
            key={key}
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            title={node.url}
            className="underline decoration-dim/60 underline-offset-2 hover:decoration-ink"
          >
            <InlineNodes nodes={node.children} />
          </a>
        );
      }

      const label = getLinkLabel(node.url);
      const LinkIcon = getLinkIcon(label);

      return (
        <a
          key={key}
          href={node.url}
          target="_blank"
          rel="noopener noreferrer"
          title={node.url}
          className="mx-0.5 inline-flex max-w-full items-center gap-1 rounded-md bg-groove px-1.5 py-px align-baseline text-[0.9em] whitespace-nowrap transition-colors hover:bg-groove/60"
        >
          <LinkIcon className="size-3.5 shrink-0 text-dim" />
          <span className="truncate">{label}</span>
        </a>
      );
    }
    default:
      return null;
  }
}
