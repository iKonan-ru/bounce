import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react';

/** Черновик поля со значением с сервера */
export interface Draft {
  /** Что сейчас в поле */
  draft: string;
  setDraft: Dispatch<SetStateAction<string>>;
  /** Начало правки - фокус в поле */
  start: () => void;
  /** Конец правки: true - текст меняли, его надо сохранить */
  finish: () => boolean;
}

/**
 * Черновик поля, которое показывает значение с сервера (название задачи, текст публикации)
 *
 * Пока человек правит поле, правка соавтора, пришедшая по realtime, набранное не затирает. Если
 * он так ничего и не поменял, после ухода из поля оно снова показывает значение с сервера, а не
 * отправляет старое поверх нового
 */
export function useDraft(value: string): Draft {
  const [draft, setDraft] = useState(value);
  // значение на начало правки; null - поле сейчас не правят
  const editStartValue = useRef<string | null>(null);

  useEffect(() => {
    if (editStartValue.current === null) {
      setDraft(value);
    }
  }, [value]);

  const start = (): void => {
    if (editStartValue.current === null) {
      editStartValue.current = draft;
    }
  };

  const finish = (): boolean => {
    const isEditing = editStartValue.current !== null;
    const isChanged = isEditing && draft !== editStartValue.current;
    editStartValue.current = null;
    if (!isChanged) {
      setDraft(value);
    }
    return isChanged;
  };

  return { draft, setDraft, start, finish };
}
