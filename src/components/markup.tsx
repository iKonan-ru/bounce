import { FileText, HardDrive, Link2, Music2, Play, Send } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { MentionName } from '@/components/mentions';
import { type Block, type Inline, linkLabel, parseMarkup } from '@/lib/markup';
import { cn } from '@/lib/utils';

// значок ссылки по сервису: музыка, видео, файлы, документы, Telegram, остальное
function linkIcon(label: string) {
  if (/^(Spotify|Яндекс Музыка|Apple Music|SoundCloud|Bandlink|YouTube Music|Suno)/.test(label))
    return Music2;
  if (/^(YouTube|TikTok|Instagram|VK)/.test(label)) return Play;
  if (/^(Яндекс Диск|Google Диск|Dropbox)/.test(label)) return HardDrive;
  if (/^Google Документы/.test(label)) return FileText;
  if (/^Telegram/.test(label)) return Send;
  return Link2;
}

// куски текста разбираются заново при каждой правке: ключ - позиция в строке
function InlineNodes({ nodes }: { nodes: Inline[] }): ReactNode {
  return nodes.map((n, i) => renderInline(n, i));
}

function renderInline(n: Inline, key: number): ReactNode {
  switch (n.t) {
    case 'text':
      return <Fragment key={key}>{n.text}</Fragment>;
    case 'bold':
      return (
        <strong key={key} className="font-semibold">
          <InlineNodes nodes={n.children} />
        </strong>
      );
    case 'italic':
      return (
        <em key={key}>
          <InlineNodes nodes={n.children} />
        </em>
      );
    case 'underline':
      return (
        <u key={key} className="underline-offset-2">
          <InlineNodes nodes={n.children} />
        </u>
      );
    case 'strike':
      return (
        <s key={key} className="text-dim">
          <InlineNodes nodes={n.children} />
        </s>
      );
    case 'mention':
      return <MentionName key={key} username={n.username} />;
    case 'code':
      return (
        <code key={key} className="rounded bg-groove px-1 py-0.5 font-mono text-[0.875em]">
          {n.text}
        </code>
      );
    case 'link': {
      if (n.children) {
        return (
          <a
            key={key}
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            title={n.url}
            className="underline decoration-dim/60 underline-offset-2 hover:decoration-ink"
          >
            <InlineNodes nodes={n.children} />
          </a>
        );
      }
      const label = linkLabel(n.url);
      const Icon = linkIcon(label);
      return (
        <a
          key={key}
          href={n.url}
          target="_blank"
          rel="noopener noreferrer"
          title={n.url}
          className="mx-0.5 inline-flex max-w-full items-center gap-1 rounded-md bg-groove px-1.5 py-px align-baseline text-[0.9em] whitespace-nowrap transition-colors hover:bg-groove/60"
        >
          <Icon className="size-3.5 shrink-0 text-dim" />
          <span className="truncate">{label}</span>
        </a>
      );
    }
  }
}

function Lines({ lines }: { lines: Inline[][] }) {
  return lines.map((l, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: строки абзаца идут по порядку
    <Fragment key={i}>
      {i > 0 && <br />}
      <InlineNodes nodes={l} />
    </Fragment>
  ));
}

function BlockView({ block }: { block: Block }) {
  switch (block.t) {
    case 'p':
      return (
        <p>
          <Lines lines={block.lines} />
        </p>
      );
    case 'ul':
      return (
        <ul className="list-disc space-y-0.5 pl-5 marker:text-dim">
          {block.items.map((item, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: пункты идут по порядку
            <li key={i}>
              <InlineNodes nodes={item} />
            </li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol start={block.start} className="list-decimal space-y-0.5 pl-6 marker:text-dim">
          {block.items.map((item, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: пункты идут по порядку
            <li key={i}>
              <InlineNodes nodes={item} />
            </li>
          ))}
        </ol>
      );
    case 'quote':
      return (
        <blockquote className="border-l-2 border-dim/40 pl-3 text-dim">
          <Lines lines={block.lines} />
        </blockquote>
      );
  }
}

// Текст заметки с разметкой (lib/markup.ts).
export function Markup({ text, className }: { text: string; className?: string }) {
  const blocks = parseMarkup(text);
  return (
    <div className={cn('flex flex-col gap-2 break-words', className)}>
      {blocks.map((b, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: блоки разбираются заново при каждой правке
        <BlockView key={i} block={b} />
      ))}
    </div>
  );
}
