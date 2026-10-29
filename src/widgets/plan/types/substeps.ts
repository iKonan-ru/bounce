import type { Checkbox as CheckboxPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';
import type { TemplateSubstep } from '@/entities/song';

/** Подэтап в редакторе: у этапа песни - с отметкой "сделано", в шаблоне этапов - без */
export interface SubstepItem extends TemplateSubstep {
  done?: boolean;
}

/** Пропсы подэтапа только для просмотра */
export interface ReadOnlySubstepProps {
  substep: SubstepItem;
  isCheckable: boolean;
}

/** Пропсы подэтапа в редакторе */
export interface EditableSubstepProps {
  substep: SubstepItem;
  /** Ручка перетаскивания от списка */
  handle: ReactNode;
  idPrefix: string;
  isCheckable: boolean;
  projectId: string | undefined;
  onRename: (id: string, title: string) => void;
  onDoneChange: (id: string, isDone: boolean) => void;
  onDelete: (id: string) => void;
}

/** Что показать у подэтапа в редакторе и его обработчики */
export interface UseEditableSubstepResult {
  checkboxId: string;
  isDone: boolean;
  titleClassName: string;
  renameLabel: string;
  deleteLabel: string;
  deleteClassName: string;
  onTitleSave: (title: string) => void;
  onCheckedChange: (state: CheckboxPrimitive.CheckedState) => void;
  onDeleteClick: () => void;
}

/** Пропсы редактора подэтапов */
export interface SubstepsEditorProps<Item extends SubstepItem> {
  /** Проект - для упоминаний людей через @ */
  projectId?: string | undefined;
  /** Начало id полей: свои у каждого редактора на странице */
  idPrefix: string;
  items: readonly Item[];
  onChange: (items: SubstepItem[]) => void;
  /** С отметкой "сделано" (у этапа песни) */
  isCheckable: boolean;
  /** Только показать: без отметок, перетаскивания и правки */
  readOnly?: boolean;
}

/** Обработчики редактора подэтапов */
export interface UseSubstepsEditorResult<Item extends SubstepItem> {
  addRowId: string;
  handleClassName: string;
  renderSubstep: (substep: Item, handle: ReactNode) => ReactNode;
  onReorder: (fromId: string, toId: string) => void;
  onSubstepAdd: (title: string) => void;
}

/** Пропсы подэтапов только для просмотра */
export interface ReadOnlySubstepsProps {
  items: readonly SubstepItem[];
  isCheckable: boolean;
}
