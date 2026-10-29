import { Minus, Plus, Copy, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/shared/ui';
import type { ReadingActionsProps } from '../types/lyrics';

/** Кнопки шапки в режиме чтения: размер шрифта, копирование, правка */
export function ReadingActions({
  canEdit,
  isSmallest,
  isLargest,
  onSmallerClick,
  onLargerClick,
  onCopyClick,
  onEditClick,
}: ReadingActionsProps): ReactNode {
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Мельче"
        disabled={isSmallest}
        onClick={onSmallerClick}
      >
        <Minus />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Крупнее"
        disabled={isLargest}
        onClick={onLargerClick}
      >
        <Plus />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Скопировать текст без меток"
        title="Скопировать текст без меток"
        onClick={onCopyClick}
      >
        <Copy />
      </Button>
      {canEdit && (
        <>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Изменить"
            className="sm:hidden"
            onClick={onEditClick}
          >
            <Pencil />
          </Button>
          <Button
            variant="secondary"
            className="max-sm:hidden"
            onClick={onEditClick}
          >
            <Pencil data-icon="inline-start" />
            Изменить
          </Button>
        </>
      )}
    </>
  );
}
