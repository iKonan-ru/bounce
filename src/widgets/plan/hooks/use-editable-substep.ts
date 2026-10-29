import type { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { cn } from '@/shared/utils';
import { HOVER_ONLY_CLASS } from '../constants/substeps';
import type {
  EditableSubstepProps,
  UseEditableSubstepResult,
} from '../types/substeps';

/** Логика подэтапа в редакторе: подписи, классы и правки */
export function useEditableSubstep({
  substep,
  idPrefix,
  isCheckable,
  onRename,
  onDoneChange,
  onDelete,
}: Omit<
  EditableSubstepProps,
  'handle' | 'projectId'
>): UseEditableSubstepResult {
  const titleClassName = cn('min-w-0 flex-1 py-1 transition-colors', {
    'pl-1': !isCheckable,
    'text-dim line-through': substep.done,
  });
  const deleteClassName = cn(
    'group/x flex size-9 shrink-0 items-center justify-center text-dim/70 transition-opacity',
    HOVER_ONLY_CLASS
  );
  const onTitleSave = (title: string): void => {
    onRename(substep.id, title);
  };
  const onCheckedChange = (state: CheckboxPrimitive.CheckedState): void => {
    onDoneChange(substep.id, state === true);
  };
  const onDeleteClick = (): void => {
    onDelete(substep.id);
  };

  return {
    checkboxId: `${idPrefix}-${substep.id}`,
    isDone: substep.done === true,
    titleClassName,
    renameLabel: `Переименовать "${substep.title}"`,
    deleteLabel: `Удалить "${substep.title}"`,
    deleteClassName,
    onTitleSave,
    onCheckedChange,
    onDeleteClick,
  };
}
