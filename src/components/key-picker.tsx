import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { SongKey, Tonic } from '@/lib/keys';
import { parseKey, getKeyLabel, TONICS, getKeyHint } from '@/lib/keys';
import {
  Popover,
  PopoverTrigger,
  Button,
  PopoverContent,
  Segmented,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

/** Лад тональности */
enum KeyMode {
  /** Мажор */
  Major = 'major',
  /** Минор */
  Minor = 'minor',
}

/** Вариант переключателя лада */
interface KeyModeOption {
  value: KeyMode;
  label: string;
}

/** Варианты переключателя лада */
const KEY_MODE_OPTIONS: readonly KeyModeOption[] = [
  { value: KeyMode.Major, label: 'Мажор' },
  { value: KeyMode.Minor, label: 'Минор' },
];

/** Пропсы выбора тональности */
interface KeyPickerProps {
  /** Тональность текстом ("Am", "C#"); пустая строка - не указана */
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
}

/** Состояние и действия выбора тональности */
interface UseKeyPickerResult {
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

/** Выбор тональности: попап, лад и выбор или сброс тоники */
function useKeyPicker(
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

/** Выбор тональности: лад (мажор/минор) и тоника - сеткой нот; набрать произвольный текст нельзя */
export function KeyPicker({
  value,
  onChange,
  disabled,
}: KeyPickerProps): ReactNode {
  const {
    currentKey,
    isOpen,
    isMinor,
    keyMode,
    onPopoverOpenChange,
    onKeyModeChange,
    handleKeyPick,
    onRemoveClick,
  } = useKeyPicker(value, onChange);

  return (
    <Popover open={isOpen} onOpenChange={onPopoverOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id="song-key"
          variant="ghost"
          disabled={disabled}
          className="-mr-2 h-9 gap-1.5 px-2 font-normal"
        >
          {currentKey ? (
            <KeyLabel songKey={currentKey} />
          ) : (
            <span className="text-dim">не указана</span>
          )}
          <ChevronDown className="size-4 text-dim" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <Segmented
          label="Лад"
          value={keyMode}
          onChange={onKeyModeChange}
          options={KEY_MODE_OPTIONS}
        />
        <div className="grid grid-cols-4 gap-1">
          {TONICS.map((tonic) => (
            <TonicButton
              key={tonic}
              tonic={tonic}
              isMinor={isMinor}
              currentKey={currentKey}
              onPick={handleKeyPick}
            />
          ))}
        </div>
        {currentKey && (
          <Button
            variant="ghost"
            className="h-9 w-full font-normal text-dim"
            onClick={onRemoveClick}
          >
            Убрать тональность
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Пропсы подписи тональности */
interface KeyLabelProps {
  songKey: SongKey;
}

/** Подпись выбранной тональности: название и пояснение */
function KeyLabel({ songKey }: KeyLabelProps): ReactNode {
  const label = getKeyLabel(songKey);
  const hint = getKeyHint(songKey);

  return (
    <>
      <span className="font-medium">{label}</span>
      <span className="text-dim">{hint}</span>
    </>
  );
}

/** Пропсы кнопки тоники */
interface TonicButtonProps {
  tonic: Tonic;
  /** Лад, для которого показана сетка */
  isMinor: boolean;
  /** Тональность, выбранная сейчас */
  currentKey: SongKey | null;
  onPick: (songKey: SongKey) => void;
}

/** Нота в сетке тоник: выбранная тональность залита */
function TonicButton({
  tonic,
  isMinor,
  currentKey,
  onPick,
}: TonicButtonProps): ReactNode {
  const songKey: SongKey = { tonic, isMinor };
  const isSelected =
    currentKey?.tonic === tonic && currentKey.isMinor === isMinor;
  const hint = getKeyHint(songKey);
  const label = getKeyLabel(songKey);
  const onTonicClick = (): void => {
    onPick(songKey);
  };
  const tonicClassName = cn(
    'h-10 rounded-lg text-sm font-medium transition-colors md:h-9',
    {
      'bg-tape text-tape-ink': isSelected,
      'bg-groove/50 hover:bg-groove': !isSelected,
    }
  );

  return (
    <button
      type="button"
      title={hint}
      aria-pressed={isSelected}
      onClick={onTonicClick}
      className={tonicClassName}
    >
      {label}
    </button>
  );
}
