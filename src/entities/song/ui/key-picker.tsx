import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Popover,
  PopoverTrigger,
  Button,
  PopoverContent,
  Segmented,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { KEY_MODE_OPTIONS } from '../constants/key-picker';
import { TONICS } from '../constants/keys';
import { useKeyPicker } from '../hooks/use-key-picker';
import type {
  KeyPickerProps,
  KeyLabelProps,
  TonicButtonProps,
} from '../types/key-picker';
import type { SongKey } from '../types/keys';
import { getKeyLabel, getKeyHint } from '../utils/keys';

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
