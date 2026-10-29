import type { SongKey, Tonic } from './keys';

/** Лад тональности */
export enum KeyMode {
  /** Мажор */
  Major = 'major',
  /** Минор */
  Minor = 'minor',
}

/** Вариант переключателя лада */
export interface KeyModeOption {
  value: KeyMode;
  label: string;
}

/** Пропсы выбора тональности */
export interface KeyPickerProps {
  /** Тональность текстом ("Am", "C#"); пустая строка - не указана */
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
}

/** Состояние и действия выбора тональности */
export interface UseKeyPickerResult {
  /** Тональность из значения; null - не указана */
  currentKey: SongKey | null;
  isOpen: boolean;
  /** Лад, для которого показана сетка нот */
  isMinor: boolean;
  keyMode: KeyMode;
  onPopoverOpenChange: (isNextOpen: boolean) => void;
  onKeyModeChange: (keyMode: KeyMode) => void;
  handleKeyPick: (songKey: SongKey) => void;
  onRemoveClick: () => void;
}

/** Пропсы подписи тональности */
export interface KeyLabelProps {
  songKey: SongKey;
}

/** Пропсы кнопки тоники */
export interface TonicButtonProps {
  tonic: Tonic;
  /** Лад, для которого показана сетка */
  isMinor: boolean;
  /** Тональность, выбранная сейчас */
  currentKey: SongKey | null;
  onPick: (songKey: SongKey) => void;
}
