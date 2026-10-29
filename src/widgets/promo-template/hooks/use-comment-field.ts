import type { ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import type { UseCommentFieldResult } from '../types/promo-template';

/**
 * Черновик комментария: сохраняется, когда уходят из поля
 *
 * Пока поле не в фокусе, оно следует за сохранённым текстом (правки соавтора приходят сами)
 */
export function useCommentField(
  value: string,
  onSave: (comment: string) => void
): UseCommentFieldResult {
  const [draft, setDraft] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  useEffect(() => {
    if (!isFocused) {
      setDraft(value);
    }
  }, [value, isFocused]);

  const onDraftChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setDraft(event.target.value);
  };
  const onFieldFocus = (): void => {
    setIsFocused(true);
  };
  const onFieldBlur = (): void => {
    setIsFocused(false);
    const next = draft.trim();

    if (next !== value) {
      onSave(next);
    }
  };

  return { draft, onDraftChange, onFieldFocus, onFieldBlur };
}
