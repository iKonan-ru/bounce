import type { Dispatch, SetStateAction, RefObject, FormEvent } from 'react';

/** Срок новой задачи */
export enum DueChoice {
  /** Без срока */
  None = 'none',
  /** Сегодня */
  Today = 'today',
  /** Завтра */
  Tomorrow = 'tomorrow',
  /** День, выбранный в календаре */
  CustomDate = 'date',
}

/** Пропсы новой задачи */
export interface TaskComposerProps {
  projectId: string;
  /** Текущий пользователь: автор задачи и исполнитель по кнопке "Мне" */
  meId: string;
}

/** Состояние и действия формы новой задачи */
export interface UseTaskComposerResult {
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  isAdding: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  /** Строка сроков видна: фокус в форме, название набрано или открыт календарь */
  isExpanded: boolean;
  isTodayChosen: boolean;
  isTomorrowChosen: boolean;
  isCustomDateChosen: boolean;
  /** День из календаря, если выбран срок "дата" */
  customDate: Date | undefined;
  /** Подпись кнопки даты: выбранный день или "Дата" */
  dateChipLabel: string;
  isMine: boolean;
  isDatePickerOpen: boolean;
  setIsDatePickerOpen: Dispatch<SetStateAction<boolean>>;
  onSubmit: (event: FormEvent) => void;
  onFormFocus: () => void;
  onFormBlur: () => void;
  onTodayClick: () => void;
  onTomorrowClick: () => void;
  onDateSelect: (date: Date | undefined) => void;
  onMineClick: () => void;
}
