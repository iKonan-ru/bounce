import {
  Bold,
  Code,
  Italic,
  Link,
  List,
  ListOrdered,
  Strikethrough,
  TextQuote,
  Underline,
} from 'lucide-react';
import type { ClipboardEvent, KeyboardEvent, RefObject } from 'react';
import { safeUrl } from '@/lib/markup';
import { cn } from '@/lib/utils';

type Action = 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'ul' | 'ol' | 'quote' | 'link';

const WRAP: Partial<Record<Action, string>> = {
  bold: '**',
  italic: '*',
  underline: '__',
  strike: '~~',
  code: '`',
};

type Edit = { value: string; start: number; end: number };

// обернуть выделение маркером; уже обёрнутое - развернуть
function wrap(e: Edit, marker: string): Edit {
  const { value, start, end } = e;
  const before = value.slice(0, start);
  const sel = value.slice(start, end);
  const after = value.slice(end);
  if (before.endsWith(marker) && after.startsWith(marker)) {
    return {
      value: before.slice(0, -marker.length) + sel + after.slice(marker.length),
      start: start - marker.length,
      end: end - marker.length,
    };
  }
  return {
    value: before + marker + sel + marker + after,
    start: start + marker.length,
    end: end + marker.length,
  };
}

const LINE_PREFIX = { ul: /^\s*[-*•]\s+/, ol: /^\s*\d{1,3}[.)]\s+/, quote: /^\s*>\s?/ };

// список или цитата для всех строк выделения; если все строки уже такие - убрать
function lines(e: Edit, kind: 'ul' | 'ol' | 'quote'): Edit {
  const { value } = e;
  const from = value.lastIndexOf('\n', e.start - 1) + 1;
  const toBreak = value.indexOf('\n', e.end);
  const to = toBreak === -1 ? value.length : toBreak;
  const block = value.slice(from, to).split('\n');
  const re = LINE_PREFIX[kind];
  const all = block.every((l) => re.test(l));
  const next = block.map((l, i) => {
    const bare = l
      .replace(LINE_PREFIX.ul, '')
      .replace(LINE_PREFIX.ol, '')
      .replace(LINE_PREFIX.quote, '');
    if (all) return bare;
    return kind === 'ul' ? `- ${bare}` : kind === 'ol' ? `${i + 1}. ${bare}` : `> ${bare}`;
  });
  const text = next.join('\n');
  return {
    value: value.slice(0, from) + text + value.slice(to),
    start: from,
    end: from + text.length,
  };
}

// ссылка: выделенный текст становится подписью, курсор - на месте адреса
function link(e: Edit, url?: string): Edit {
  const { value, start, end } = e;
  const sel = value.slice(start, end) || 'ссылка';
  const target = url ?? 'https://';
  const text = `[${sel}](${target})`;
  const at = start + sel.length + 3;
  return {
    value: value.slice(0, start) + text + value.slice(end),
    start: url ? start + text.length : at,
    end: url ? start + text.length : at + target.length,
  };
}

function apply(e: Edit, action: Action): Edit {
  const marker = WRAP[action];
  if (marker) return wrap(e, marker);
  if (action === 'ul' || action === 'ol' || action === 'quote') return lines(e, action);
  return link(e);
}

// Правка разметки в поле: кнопки панели, сочетания клавиш (Cmd/Ctrl + B, I, U, K), вставка
// адреса поверх выделения делает из него ссылку.
export function useMarkupEditing(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  setValue: (v: string) => void,
) {
  function run(change: (e: Edit) => Edit) {
    const el = ref.current;
    if (!el) return;
    const next = change({ value, start: el.selectionStart, end: el.selectionEnd });
    setValue(next.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.start, next.end);
    });
  }

  const onAction = (action: Action) => run((e) => apply(e, action));

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): boolean {
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return false;
    const key = e.key.toLowerCase();
    const map: Record<string, Action> = {
      b: 'bold',
      i: 'italic',
      u: 'underline',
      k: 'link',
      и: 'bold',
      ш: 'italic',
      г: 'underline',
      л: 'link',
    };
    const action = map[key];
    if (!action) return false;
    e.preventDefault();
    onAction(action);
    return true;
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>): boolean {
    const el = ref.current;
    if (!el || el.selectionStart === el.selectionEnd) return false;
    const url = safeUrl(e.clipboardData.getData('text').trim());
    if (!url) return false;
    e.preventDefault();
    run((ed) => link(ed, url));
    return true;
  }

  return { onAction, onKeyDown, onPaste };
}

const BUTTONS: { action: Action; label: string; icon: typeof Bold }[] = [
  { action: 'bold', label: 'Жирный', icon: Bold },
  { action: 'italic', label: 'Курсив', icon: Italic },
  { action: 'underline', label: 'Подчёркнутый', icon: Underline },
  { action: 'strike', label: 'Зачёркнутый', icon: Strikethrough },
  { action: 'ul', label: 'Список', icon: List },
  { action: 'ol', label: 'Нумерованный список', icon: ListOrdered },
  { action: 'quote', label: 'Цитата', icon: TextQuote },
  { action: 'code', label: 'Моноширинный', icon: Code },
  { action: 'link', label: 'Ссылка', icon: Link },
];

export function MarkupToolbar({
  onAction,
  disabled,
  className,
}: {
  onAction: (a: Action) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Оформление текста"
      className={cn('flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none]', className)}
    >
      {BUTTONS.map((b) => (
        <button
          key={b.action}
          type="button"
          title={b.label}
          aria-label={b.label}
          disabled={disabled}
          // нажатие не уводит фокус из поля: выделение остаётся
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onAction(b.action)}
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-dim transition-colors hover:bg-groove hover:text-ink disabled:opacity-40 md:size-8"
        >
          <b.icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
