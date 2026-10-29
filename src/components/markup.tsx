import {
  FileText,
  HardDrive,
  Link2,
  type LucideIcon,
  Music2,
  Play,
  Send,
} from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { MentionName } from '@/components/mentions';
import {
  type Block,
  BlockKind,
  getLinkLabel,
  type Inline,
  InlineKind,
  parseMarkup,
} from '@/lib/markup';
import { cn } from '@/lib/utils';

/** Значок ссылки для сервисов, подпись которых подходит под шаблон */
interface LinkIconRule {
  pattern: RegExp;
  icon: LucideIcon;
}

/** Значки ссылок по сервису: музыка, видео, файлы, документы, Telegram; берётся первое совпадение */
const LINK_ICON_RULES: readonly LinkIconRule[] = [
  {
    pattern:
      /^(Spotify|Яндекс Музыка|Apple Music|SoundCloud|Bandlink|YouTube Music|Suno)/,
    icon: Music2,
  },
  { pattern: /^(YouTube|TikTok|Instagram|VK)/, icon: Play },
  { pattern: /^(Яндекс Диск|Google Диск|Dropbox)/, icon: HardDrive },
  { pattern: /^Google Документы/, icon: FileText },
  { pattern: /^Telegram/, icon: Send },
];

/** Значок ссылки по сервису; остальным ссылкам - общий значок */
function getLinkIcon(label: string): LucideIcon {
  const rule = LINK_ICON_RULES.find((linkRule) => linkRule.pattern.test(label));

  if (!rule) {
    return Link2;
  }

  return rule.icon;
}

/** Пропсы кусков строки */
interface InlineNodesProps {
  nodes: Inline[];
}

/** Куски строки; разбираются заново при каждой правке, поэтому ключ - позиция в строке */
function InlineNodes({ nodes }: InlineNodesProps): ReactNode {
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

/** Пропсы строк абзаца */
interface LinesProps {
  lines: Inline[][];
}

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

/** Пропсы блока текста */
interface BlockViewProps {
  block: Block;
}

/** Блок текста: абзац, список, нумерованный список или цитата */
function BlockView({ block }: BlockViewProps): ReactNode {
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

/** Пропсы текста с разметкой */
interface MarkupProps {
  text: string;
  className?: string;
}

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
