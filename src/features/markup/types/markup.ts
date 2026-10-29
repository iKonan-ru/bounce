import type { LucideIcon } from 'lucide-react';
import type { Inline, Block } from '@/shared/types';

/** Значок ссылки для сервисов, подпись которых подходит под шаблон */
export interface LinkIconRule {
  pattern: RegExp;
  icon: LucideIcon;
}

/** Пропсы кусков строки */
export interface InlineNodesProps {
  nodes: Inline[];
}

/** Пропсы строк абзаца */
export interface LinesProps {
  lines: Inline[][];
}

/** Пропсы блока текста */
export interface BlockViewProps {
  block: Block;
}

/** Пропсы текста с разметкой */
export interface MarkupProps {
  text: string;
  className?: string;
}
