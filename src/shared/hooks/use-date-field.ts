import { useState } from 'react';
import type {
  CalendarMonthProps,
  UseDateFieldParams,
  UseDateFieldResult,
} from '../types/date-field';
import {
  convertDayToPbDate,
  convertPbDateToDay,
  getDateLabel,
} from '../utils/format';

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
export function useDateField({
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
