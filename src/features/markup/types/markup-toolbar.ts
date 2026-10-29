import type { LucideIcon } from 'lucide-react';
import type { MarkupAction } from './markup-editing';

/** Описание кнопки панели оформления */
export interface MarkupButton {
  action: MarkupAction;
  label: string;
  icon: LucideIcon;
}

/** Пропсы кнопки панели оформления */
export interface MarkupToolbarButtonProps {
  button: MarkupButton;
  disabled: boolean | undefined;
  onAction: (action: MarkupAction) => void;
}

/** Пропсы панели оформления */
export interface MarkupToolbarProps {
  onAction: (action: MarkupAction) => void;
  disabled?: boolean;
  className?: string;
}
