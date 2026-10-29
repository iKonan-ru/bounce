import type { ChangeEvent, KeyboardEvent } from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  SENT_HOLD_MS,
  ENTER_KEY,
  ESCAPE_KEY,
} from '../constants/autosave-input';
import type {
  UseAutosaveInputParams,
  UseAutosaveInputResult,
} from '../types/autosave-input';

/** Поле с автосохранением: черновик, отправленное значение и отмена по Escape */
export function useAutosaveInput({
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
