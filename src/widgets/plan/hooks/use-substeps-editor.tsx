import type { ReactNode } from 'react';
import { getNewRecordId, moveItemById, cn } from '@/shared/utils';
import { HOVER_ONLY_CLASS } from '../constants/substeps';
import type {
  SubstepItem,
  SubstepsEditorProps,
  UseSubstepsEditorResult,
} from '../types/substeps';
import { EditableSubstep } from '../ui/editable-substep';

/** Новый подэтап; с отметками - ещё не сделанный */
function createSubstep(title: string, isCheckable: boolean): SubstepItem {
  const id = getNewRecordId();

  if (!isCheckable) {
    return { id, title };
  }

  return { id, title, done: false };
}

/** Подэтапы, где у подэтапа с этим id изменены поля из patch */
function patchSubstep(
  items: readonly SubstepItem[],
  id: string,
  patch: Partial<SubstepItem>
): SubstepItem[] {
  return items.map((substep) => {
    if (substep.id !== id) {
      return substep;
    }

    return { ...substep, ...patch };
  });
}

/** Логика редактора подэтапов: порядок, переименование, отметки, удаление и добавление */
export function useSubstepsEditor<Item extends SubstepItem>({
  projectId,
  idPrefix,
  items,
  onChange,
  isCheckable,
}: SubstepsEditorProps<Item>): UseSubstepsEditorResult<Item> {
  const onReorder = (fromId: string, toId: string): void => {
    onChange(moveItemById(items, fromId, toId));
  };
  const onSubstepRename = (id: string, title: string): void => {
    onChange(patchSubstep(items, id, { title }));
  };
  const onSubstepDoneChange = (id: string, isDone: boolean): void => {
    onChange(patchSubstep(items, id, { done: isDone }));
  };
  const onSubstepDelete = (id: string): void => {
    onChange(items.filter((substep) => substep.id !== id));
  };
  const onSubstepAdd = (title: string): void => {
    onChange([...items, createSubstep(title, isCheckable)]);
  };
  const renderSubstep = (substep: Item, handle: ReactNode): ReactNode => (
    <EditableSubstep
      substep={substep}
      handle={handle}
      idPrefix={idPrefix}
      isCheckable={isCheckable}
      projectId={projectId}
      onRename={onSubstepRename}
      onDoneChange={onSubstepDoneChange}
      onDelete={onSubstepDelete}
    />
  );

  return {
    addRowId: `${idPrefix}-new`,
    handleClassName: cn('h-10 w-6', HOVER_ONLY_CLASS),
    renderSubstep,
    onReorder,
    onSubstepAdd,
  };
}
