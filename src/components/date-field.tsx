import { CalendarDays, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { convertDayToPbDate, convertPbDateToDay, getDateLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Пропсы поля даты */
interface DateFieldProps {
  id?: string;
  /** Дата в формате PocketBase; пустая строка - не выбрана */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Дата просрочена: красным */
  isOverdue?: boolean;
  /** В строке свойств - тихая кнопка без рамки */
  isQuiet?: boolean;
  /** False - выбранную дату можно сменить, но не убрать (дата релиза отправленной песни) */
  isClearable?: boolean;
}

/** Параметры поля даты: значения по умолчанию уже подставлены */
interface UseDateFieldParams extends Pick<DateFieldProps, 'value' | 'onChange'> {
  placeholder: string;
  disabled: boolean | undefined;
  isClearable: boolean;
}

/** Месяц, который календарь показывает при открытии */
interface CalendarMonthProps {
  defaultMonth?: Date;
}

/** Состояние и действия поля даты */
interface UseDateFieldResult {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  /** Выбранный день */
  day: Date | undefined;
  /** Подпись кнопки: дата или подсказка */
  triggerLabel: string;
  /** Повторное нажатие на выбранный день не снимает дату */
  isDateRequired: boolean;
  calendarMonthProps: CalendarMonthProps;
  /** Показать крестик "Убрать дату" */
  canClear: boolean;
  onDateSelect: (date: Date | undefined) => void;
  onClearClick: () => void;
}

/** Значение поля по выбранному дню: без дня - пустая строка */
function convertDayToValue(date: Date | undefined): string {
  if (!date) {
    return '';
  }
  return convertDayToPbDate(date);
}

/** Календарь открывается на месяце выбранного дня; без дня - на текущем */
function getCalendarMonthProps(day: Date | undefined): CalendarMonthProps {
  if (!day) {
    return {};
  }
  return { defaultMonth: day };
}

/** Поле даты: календарь в попапе, выбор и сброс даты */
function useDateField({
  value,
  onChange,
  placeholder,
  disabled,
  isClearable,
}: UseDateFieldParams): UseDateFieldResult {
  const [isOpen, setIsOpen] = useState(false);
  const day = convertPbDateToDay(value);
  const dateLabel = getDateLabel(value);
  const triggerLabel = value ? dateLabel : placeholder;
  // без required повторное нажатие на выбранный день снимает дату
  const isDateRequired = !isClearable && day !== undefined;
  const canClear = Boolean(value) && !disabled && isClearable;

  const onDateSelect = (date: Date | undefined): void => {
    onChange(convertDayToValue(date));
    setIsOpen(false);
  };

  const onClearClick = (): void => {
    onChange('');
  };

  return {
    isOpen,
    setIsOpen,
    day,
    triggerLabel,
    isDateRequired,
    calendarMonthProps: getCalendarMonthProps(day),
    canClear,
    onDateSelect,
    onClearClick,
  };
}

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
    'disabled:opacity-100',
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
