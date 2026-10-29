import { CalendarDays, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useDateField } from '../hooks/use-date-field';
import type { DateFieldProps } from '../types/date-field';
import { cn } from '../utils/cn';
import { Button } from './kit/button';
import { Calendar } from './kit/calendar';
import { Popover, PopoverTrigger, PopoverContent } from './kit/popover';

/** Дата без времени (срок этапа, релиз): кнопка с датой, по нажатию - календарь */
export function DateField({
  id,
  value,
  onChange,
  placeholder = 'Выбрать дату',
  disabled,
  isOverdue,
  isQuiet,
  isClearable = true,
}: DateFieldProps): ReactNode {
  const {
    isOpen,
    setIsOpen,
    day,
    triggerLabel,
    isDateRequired,
    calendarMonthProps,
    canClear,
    onDateSelect,
    onClearClick,
  } = useDateField({ value, onChange, placeholder, disabled, isClearable });
  const triggerVariant = isQuiet ? 'ghost' : 'outline';
  const clearButtonSize = isQuiet ? 'icon-sm' : 'icon';
  const triggerClassName = cn(
    {
      '-mr-2 h-9 gap-2 px-2 font-normal': isQuiet,
      'h-11 justify-start gap-2 px-3 font-normal': !isQuiet,
      'text-dim': !value,
      'text-led-red': isOverdue,
    },
    'disabled:opacity-100'
  );

  return (
    <div className="flex items-center gap-1">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant={triggerVariant}
            disabled={disabled}
            className={triggerClassName}
          >
            <CalendarDays className="size-4" />
            {triggerLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            mode="single"
            required={isDateRequired}
            selected={day}
            {...calendarMonthProps}
            onSelect={onDateSelect}
          />
        </PopoverContent>
      </Popover>
      {canClear && (
        <Button
          type="button"
          variant="ghost"
          size={clearButtonSize}
          aria-label="Убрать дату"
          className="text-dim"
          onClick={onClearClick}
        >
          <X />
        </Button>
      )}
    </div>
  );
}
