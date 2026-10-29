import type { ReactNode } from 'react';
import { PeoplePicker } from '@/entities/project';
import { EditableTitle } from '@/features/mentions';
import { GROUP_ROWS } from '@/shared/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DoneCheck,
  PropRow,
  DateField,
  MenuSelect,
  ItemDialogFooter,
} from '@/shared/ui';
import { useTaskDialog } from '../hooks/use-task-dialog';
import type { TaskDialogProps } from '../types/task-dialog';

/** Задача целиком: название, срок, кто делает, песня; удалить */
export function TaskDialog({
  task,
  canWork,
  open,
  onOpenChange,
}: TaskDialogProps): ReactNode {
  const {
    isDone,
    isOverdue,
    due,
    assignees,
    songValue,
    songOptions,
    isDeleting,
    onDoneChange,
    onTitleCommit,
    onDueChange,
    onAssigneesChange,
    onSongChange,
    onDeleteConfirm,
    onDoneClick,
  } = useTaskDialog(task, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4">
        <DialogHeader>
          <DialogTitle className="sr-only">Задача</DialogTitle>
          <div className="flex items-start gap-2 pr-8">
            <DoneCheck
              checked={isDone}
              label="Выполнено"
              disabled={!canWork}
              onDone={onDoneChange}
              className="m-0 size-8"
            />
            <EditableTitle
              id="task-title"
              label="Название"
              value={task.title}
              projectId={task.project}
              disabled={!canWork}
              onCommit={onTitleCommit}
            />
          </div>
        </DialogHeader>
        <div className={GROUP_ROWS}>
          <PropRow label="Срок">
            <DateField
              isQuiet
              id="task-due"
              disabled={!canWork}
              value={due}
              isOverdue={isOverdue}
              placeholder="Без срока"
              onChange={onDueChange}
            />
          </PropRow>
          <PropRow label="Кто делает">
            <PeoplePicker
              projectId={task.project}
              value={assignees}
              disabled={!canWork}
              onChange={onAssigneesChange}
            />
          </PropRow>
          <PropRow label="Песня">
            <MenuSelect
              label="Песня"
              value={songValue}
              isDim={!task.song}
              disabled={!canWork}
              onChange={onSongChange}
              options={songOptions}
            />
          </PropRow>
        </div>
        <ItemDialogFooter
          canWork={canWork}
          title={task.title}
          isDeleting={isDeleting}
          onDelete={onDeleteConfirm}
          onDone={onDoneClick}
        />
      </DialogContent>
    </Dialog>
  );
}
