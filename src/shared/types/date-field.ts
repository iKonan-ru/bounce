/** Пропсы поля даты */
export interface DateFieldProps {
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
export interface UseDateFieldParams extends Pick<
  DateFieldProps,
  'value' | 'onChange'
> {
  placeholder: string;
  disabled: boolean | undefined;
  isClearable: boolean;
}

/** Месяц, который календарь показывает при открытии */
export interface CalendarMonthProps {
  defaultMonth?: Date;
}

/** Состояние и действия поля даты */
export interface UseDateFieldResult {
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
