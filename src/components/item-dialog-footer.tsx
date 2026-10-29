import { Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';

/** Пропсы подвала окна задачи или публикации */
interface ItemDialogFooterProps {
  /** Можно править: есть кнопка "Удалить" */
  canWork: boolean;
  /** Название в вопросе "Удалить ...?" */
  title: string;
  /** Удаление выполняется */
  isDeleting: boolean;
  onDelete: () => void;
  onDone: () => void;
}

/**
 * Подвал окна задачи или публикации: "Удалить" с подтверждением слева (если можно править),
 * "Готово" справа
 *
 * После удаления окно закрывает тот, кто его открыл, - вместе с подтверждением
 */
export function ItemDialogFooter({
  canWork,
  title,
  isDeleting,
  onDelete,
  onDone,
}: ItemDialogFooterProps): ReactNode {
  const [isConfirming, setIsConfirming] = useState(false);
  const onDeleteClick = (): void => {
    setIsConfirming(true);
  };
  const confirmTitle = `Удалить "${title}"?`;

  return (
    <>
      <DialogFooter className="flex-row items-center justify-between sm:justify-between">
        {canWork ? (
          <Button
            variant="ghost"
            className="-ml-3.5 text-led-red hover:bg-led-red/10 hover:text-led-red"
            onClick={onDeleteClick}
          >
            <Trash2 data-icon="inline-start" />
            Удалить
          </Button>
        ) : (
          <span />
        )}
        <Button variant="secondary" onClick={onDone}>
          Готово
        </Button>
      </DialogFooter>
      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        title={confirmTitle}
        confirmLabel="Удалить"
        isBusy={isDeleting}
        onConfirm={onDelete}
      />
    </>
  );
}
