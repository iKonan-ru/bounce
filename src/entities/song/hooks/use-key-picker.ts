import { useState } from 'react';
import type { UseKeyPickerResult } from '../types/key-picker';
import { KeyMode } from '../types/key-picker';
import type { SongKey } from '../types/keys';
import { parseKey, getKeyLabel } from '../utils/keys';

/** Выбор тональности: попап, лад и выбор или сброс тоники */
export function useKeyPicker(
  value: string,
  onChange: (key: string) => void
): UseKeyPickerResult {
  const currentKey = parseKey(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinor, setIsMinor] = useState(currentKey?.isMinor ?? false);
  const keyMode = isMinor ? KeyMode.Minor : KeyMode.Major;

  const handleKeyPick = (songKey: SongKey): void => {
    const nextValue = getKeyLabel(songKey);

    if (nextValue !== value) {
      onChange(nextValue);
    }

    setIsOpen(false);
  };

  const onPopoverOpenChange = (isNextOpen: boolean): void => {
    setIsOpen(isNextOpen);

    if (isNextOpen) {
      setIsMinor(currentKey?.isMinor ?? false);
    }
  };

  const onKeyModeChange = (nextKeyMode: KeyMode): void => {
    setIsMinor(nextKeyMode === KeyMode.Minor);
  };

  const onRemoveClick = (): void => {
    onChange('');
    setIsOpen(false);
  };

  return {
    currentKey,
    isOpen,
    isMinor,
    keyMode,
    onPopoverOpenChange,
    onKeyModeChange,
    handleKeyPick,
    onRemoveClick,
  };
}
