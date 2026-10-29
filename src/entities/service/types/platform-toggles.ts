import type { Service } from './services';

/** Пропсы кнопок площадок */
export interface PlatformTogglesProps {
  /** Выбранные площадки (id) */
  value: readonly string[];
  /** Нажатие на площадку; isSelected - была ли она выбрана до нажатия */
  onToggle: (id: string, isSelected: boolean) => void;
}

/** Пропсы кнопки одной площадки */
export interface PlatformToggleProps {
  platform: Service;
  isSelected: boolean;
  onToggle: (id: string, isSelected: boolean) => void;
}
