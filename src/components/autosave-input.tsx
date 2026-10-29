import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Отправленное значение ждёт ответа сервера не дольше этого: если правка не дошла или её
 * перебили, поле снова показывает то, что на сервере
 */
const SENT_HOLD_MS = 8000;

/** Клавиша, которой сохраняют значение */
const ENTER_KEY = 'Enter';

/** Клавиша, которой отменяют правку */
const ESCAPE_KEY = 'Escape';

/** Пропсы поля с автосохранением */
interface AutosaveInputProps {
  id?: string;
  /** Значение с сервера */
  value: string;
  /** Новое значение после normalize */
  onSave: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  inputMode?: 'numeric' | 'text';
  /** Приведение набранного к сохраняемому виду; по умолчанию - без пробелов по краям */
  normalize?: (value: string) => string;
  /** Что можно набрать: лишние символы отбрасываются сразу при вводе */
  filter?: (value: string) => string;
  /** Проверка значения: неверное не сохраняется */
  validate?: (value: string) => boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Параметры поля с автосохранением: значения по умолчанию уже подставлены */
interface UseAutosaveInputParams extends Pick<
  AutosaveInputProps,
  'value' | 'onSave'
> {
  normalize: (value: string) => string;
  filter: ((value: string) => string) | undefined;
  validate: (value: string) => boolean;
  required: boolean | undefined;
}

/** Состояние и действия поля с автосохранением */
interface UseAutosaveInputResult {
  /** Что сейчас в поле */
  draft: string;
  isValid: boolean;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onInputFocus: () => void;
  onInputBlur: () => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

/** Значение без пробелов по краям */
function trimValue(value: string): string {
  return value.trim();
}

/** Любое значение подходит */
function acceptAnyValue(): boolean {
  return true;
}

/** Поле с автосохранением: черновик, отправленное значение и отмена по Escape */
function useAutosaveInput({
  value,
  onSave,
  normalize,
  filter,
  validate,
  required,
}: UseAutosaveInputParams): UseAutosaveInputResult {
  const [draft, setDraft] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  // отправленное значение держится в поле, пока сервер не вернёт его (без мигания старым)
  const [sentValue, setSentValue] = useState<string | null>(null);
  useEffect(() => {
    const isSentConfirmed = sentValue !== null && value === sentValue;

    if (isSentConfirmed) {
      setSentValue(null);
    }

    const shouldFollowValue = !isFocused && sentValue === null;

    if (shouldFollowValue) {
      setDraft(value);
    }
  }, [value, isFocused, sentValue]);
  useEffect(() => {
    if (sentValue === null) {
      return;
    }

    const timer = setTimeout(() => {
      setSentValue(null);
    }, SENT_HOLD_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [sentValue]);

  const normalizedDraft = normalize(draft);
  const isFilled = !required || normalizedDraft !== '';
  const isValid = validate(normalizedDraft) && isFilled;
  // Escape: поле теряет фокус, и blur сохранил бы набранное - эта отметка его отменяет
  const wasCancelled = useRef(false);

  const handleCommit = (): void => {
    if (wasCancelled.current) {
      wasCancelled.current = false;
      setDraft(value);

      return;
    }

    if (!isValid) {
      setDraft(value);

      return;
    }

    if (normalizedDraft !== value) {
      setSentValue(normalizedDraft);
      setDraft(normalizedDraft);
      onSave(normalizedDraft);
    }
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const typedValue = event.target.value;

    if (filter) {
      setDraft(filter(typedValue));

      return;
    }

    setDraft(typedValue);
  };

  const onInputFocus = (): void => {
    setIsFocused(true);
  };

  const onInputBlur = (): void => {
    setIsFocused(false);
    handleCommit();
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === ENTER_KEY) {
      event.currentTarget.blur();
    }

    if (event.key === ESCAPE_KEY) {
      wasCancelled.current = true;
      setDraft(value);
      event.currentTarget.blur();
    }
  };

  return {
    draft,
    isValid,
    onInputChange,
    onInputFocus,
    onInputBlur,
    onInputKeyDown,
  };
}

/**
 * Поле без кнопки "Сохранить": значение уходит при уходе из поля или по Enter
 *
 * Пока поле не в фокусе, оно следует за сохранённым значением (правки соавтора приходят сами)
 */
export function AutosaveInput({
  id,
  value,
  onSave,
  placeholder,
  maxLength,
  inputMode,
  normalize = trimValue,
  filter,
  validate = acceptAnyValue,
  required,
  disabled,
  className,
}: AutosaveInputProps): ReactNode {
  const {
    draft,
    isValid,
    onInputChange,
    onInputFocus,
    onInputBlur,
    onInputKeyDown,
  } = useAutosaveInput({
    value,
    onSave,
    normalize,
    filter,
    validate,
    required,
  });
  const inputClassName = cn(
    'h-10 border-0 bg-transparent px-2 text-right shadow-none hover:bg-groove/40 focus-visible:bg-groove/40 focus-visible:ring-0 dark:bg-transparent md:h-9',
    className
  );

  return (
    <Input
      id={id}
      value={draft}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      disabled={disabled}
      aria-invalid={!isValid}
      onChange={onInputChange}
      onFocus={onInputFocus}
      onBlur={onInputBlur}
      onKeyDown={onInputKeyDown}
      className={inputClassName}
    />
  );
}
