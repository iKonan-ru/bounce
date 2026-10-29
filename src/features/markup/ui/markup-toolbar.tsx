import type { ReactNode, MouseEvent } from 'react';
import { cn } from '@/shared/utils';
import { MARKUP_BUTTONS } from '../constants/markup-toolbar';
import type {
  MarkupToolbarButtonProps,
  MarkupToolbarProps,
} from '../types/markup-toolbar';

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
