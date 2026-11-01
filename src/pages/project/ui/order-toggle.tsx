import { Check, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';
import type { OrderToggleProps } from '../types/project';

/** Кнопка режима порядка: "Порядок" включает его, "Готово" - применяет */
export function OrderToggle({
  isOrdering,
  toggleRef,
  onClick,
}: OrderToggleProps): ReactNode {
  const orderLabel = isOrdering ? 'Готово' : 'Порядок';
  const orderVariant = isOrdering ? 'default' : 'ghost';
  // на телефоне - только значок: место в строке остаётся статусам
  const toggleClassName = cn(
    'h-8 shrink-0 gap-1.5 max-sm:w-8 max-sm:px-0 sm:px-2.5',
    {
      'text-dim': !isOrdering,
    }
  );

  return (
    <Button
      ref={toggleRef}
      size="sm"
      variant={orderVariant}
      aria-pressed={isOrdering}
      aria-label={orderLabel}
      title={orderLabel}
      className={toggleClassName}
      onClick={onClick}
    >
      {isOrdering ? <Check /> : <ArrowUpDown />}
      <span className="max-sm:hidden">{orderLabel}</span>
    </Button>
  );
}
