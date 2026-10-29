import {
  Bold,
  Code,
  Italic,
  Link,
  List,
  ListOrdered,
  type LucideIcon,
  Strikethrough,
  TextQuote,
  Underline,
} from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { BlockKind, InlineKind } from '@/lib/markup';
import type { MarkupAction } from '@/lib/markup-editing';
import { cn } from '@/lib/utils';

/** Описание кнопки панели оформления */
interface MarkupButton {
  action: MarkupAction;
  label: string;
  icon: LucideIcon;
}

/** Кнопки панели оформления по порядку */
const MARKUP_BUTTONS: readonly MarkupButton[] = [
  { action: InlineKind.Bold, label: 'Жирный', icon: Bold },
  { action: InlineKind.Italic, label: 'Курсив', icon: Italic },
  { action: InlineKind.Underline, label: 'Подчёркнутый', icon: Underline },
  { action: InlineKind.Strike, label: 'Зачёркнутый', icon: Strikethrough },
  { action: BlockKind.List, label: 'Список', icon: List },
  {
    action: BlockKind.OrderedList,
    label: 'Нумерованный список',
    icon: ListOrdered,
  },
  { action: BlockKind.Quote, label: 'Цитата', icon: TextQuote },
  { action: InlineKind.Code, label: 'Моноширинный', icon: Code },
  { action: InlineKind.Link, label: 'Ссылка', icon: Link },
];

/** Пропсы кнопки панели оформления */
interface MarkupToolbarButtonProps {
  button: MarkupButton;
  disabled: boolean | undefined;
  onAction: (action: MarkupAction) => void;
}

/** Кнопка панели оформления */
function MarkupToolbarButton({
  button,
  disabled,
  onAction,
}: MarkupToolbarButtonProps): ReactNode {
  const ButtonIcon = button.icon;
  // нажатие не уводит фокус из поля: выделение остаётся
  const onButtonMouseDown = (event: MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
  };
  const onButtonClick = (): void => {
    onAction(button.action);
  };

  return (
    <button
      type="button"
      title={button.label}
      aria-label={button.label}
      disabled={disabled}
      onMouseDown={onButtonMouseDown}
      onClick={onButtonClick}
      className="flex size-9 shrink-0 items-center justify-center rounded-md text-dim transition-colors hover:bg-groove hover:text-ink disabled:opacity-40 md:size-8"
    >
      <ButtonIcon className="size-4" />
    </button>
  );
}

/** Пропсы панели оформления */
interface MarkupToolbarProps {
  onAction: (action: MarkupAction) => void;
  disabled?: boolean;
  className?: string;
}

/** Панель оформления текста над полем */
export function MarkupToolbar({
  onAction,
  disabled,
  className,
}: MarkupToolbarProps): ReactNode {
  const toolbarClassName = cn(
    'flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none]',
    className
  );

  return (
    <div
      role="toolbar"
      aria-label="Оформление текста"
      className={toolbarClassName}
    >
      {MARKUP_BUTTONS.map((button) => (
        <MarkupToolbarButton
          key={button.action}
          button={button}
          disabled={disabled}
          onAction={onAction}
        />
      ))}
    </div>
  );
}
