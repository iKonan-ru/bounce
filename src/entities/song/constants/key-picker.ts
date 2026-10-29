import type { KeyModeOption } from '../types/key-picker';
import { KeyMode } from '../types/key-picker';

/** Варианты переключателя лада */
export const KEY_MODE_OPTIONS: readonly KeyModeOption[] = [
  { value: KeyMode.Major, label: 'Мажор' },
  { value: KeyMode.Minor, label: 'Минор' },
];
