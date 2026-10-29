import type { ReactNode } from 'react';

/** Вариант выбора в меню */
export interface MenuOption<Value extends string> {
  value: Value;
  label: string;
  /** Пояснение под названием */
  hint?: string;
  icon?: ReactNode;
  /** Черта над пунктом: отделить "без песни", "нет доступа" */
  isSeparated?: boolean;
}

/** Пропсы выбора одного варианта */
export interface MenuSelectProps<Value extends string> {
  value: Value;
  options: readonly MenuOption<Value>[];
  onChange: (value: Value) => void;
  /** Для экранного диктора: что выбирается */
  label: string;
  /** Значение-пустышка ("Без песни", "Нет доступа") - приглушённым цветом */
  isDim?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Пропсы пункта меню выбора */
export interface MenuSelectItemProps<Value extends string> {
  option: MenuOption<Value>;
  /** Значение, выбранное сейчас */
  currentValue: Value;
  onSelect: (value: Value) => void;
}
