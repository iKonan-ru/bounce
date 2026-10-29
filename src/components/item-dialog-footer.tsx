import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';

// Подвал окна задачи или публикации: "Удалить" с подтверждением слева (если можно править),
// "Готово" справа. После удаления окно закрывает тот, кто его открыл, - вместе с подтверждением.
export function ItemDialogFooter({
  canWork,
  title,
  deleting,
  onDelete,
  onDone,
}: {
  canWork: boolean;
  // название в вопросе "Удалить ...?"
  title: string;
  deleting: boolean;
  onDelete: () => void;
  onDone: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <DialogFooter className="flex-row items-center justify-between sm:justify-between">
        {canWork ? (
          <Button
            variant="ghost"
            className="-ml-3.5 text-led-red hover:bg-led-red/10 hover:text-led-red"
            onClick={() => setConfirming(true)}
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
        open={confirming}
        onOpenChange={setConfirming}
        title={`Удалить "${title}"?`}
        confirm="Удалить"
        busy={deleting}
        onConfirm={onDelete}
      />
    </>
  );
}
