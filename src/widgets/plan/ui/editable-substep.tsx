import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { InlineTitle } from '@/features/mentions';
import { Checkbox } from '@/shared/ui';
import { SUBSTEP_TITLE_MAX_LENGTH } from '../constants/substeps';
import { useEditableSubstep } from '../hooks/use-editable-substep';
import type { EditableSubstepProps } from '../types/substeps';

/** Подэтап в редакторе: ручка, отметка, название с правкой по нажатию и удаление */
export function EditableSubstep({
  substep,
  handle,
  idPrefix,
  isCheckable,
  projectId,
  onRename,
  onDoneChange,
  onDelete,
}: EditableSubstepProps): ReactNode {
  const {
    checkboxId,
    isDone,
    titleClassName,
    renameLabel,
    deleteLabel,
    deleteClassName,
    onTitleSave,
    onCheckedChange,
    onDeleteClick,
  } = useEditableSubstep({
    substep,
    idPrefix,
    isCheckable,
    onRename,
    onDoneChange,
    onDelete,
  });

  return (
    <div className="group/sub flex min-h-12 items-center gap-1 pr-2 pl-1 md:min-h-10">
      {handle}
      {isCheckable && (
        <label
          htmlFor={checkboxId}
          className="-ml-1 flex size-10 shrink-0 cursor-pointer items-center justify-center md:size-8"
        >
          <Checkbox
            id={checkboxId}
            aria-label={substep.title}
            className="size-5 rounded-full md:size-[1.125rem]"
            checked={isDone}
            onCheckedChange={onCheckedChange}
          />
        </label>
      )}
      <div className={titleClassName}>
        <InlineTitle
          value={substep.title}
          label={renameLabel}
          maxLength={SUBSTEP_TITLE_MAX_LENGTH}
          showPencil={false}
          mentionProjectId={projectId}
          onSave={onTitleSave}
        />
      </div>
      <button
        type="button"
        aria-label={deleteLabel}
        onClick={onDeleteClick}
        className={deleteClassName}
      >
        <span className="flex size-6 items-center justify-center rounded-md transition-colors group-hover/x:bg-groove group-hover/x:text-ink">
          <X className="size-4" />
        </span>
      </button>
    </div>
  );
}
