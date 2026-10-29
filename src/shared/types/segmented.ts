/** Вариант переключателя */
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** Пропсы переключателя */
export interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Подпись группы для экранного диктора */
  label: string;
  /** Только смотреть (наблюдатель): выбранный вариант виден, переключить нельзя */
  disabled?: boolean;
  className?: string;
}

/** Пропсы кнопки варианта */
export interface SegmentedButtonProps<T extends string> {
  option: SegmentedOption<T>;
  isSelected: boolean;
  onSelect: (value: T) => void;
}
