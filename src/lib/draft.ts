import { useEffect, useRef, useState } from 'react';

// Черновик поля, которое показывает значение с сервера (название задачи, текст публикации).
// Пока человек правит поле, правка соавтора, пришедшая по realtime, набранное не затирает. Если
// он так ничего и не поменял, после ухода из поля оно снова показывает значение с сервера, а не
// отправляет старое поверх нового.
export function useDraft(value: string) {
  const [draft, setDraft] = useState(value);
  // значение на начало правки; null - поле сейчас не правят
  const base = useRef<string | null>(null);
  useEffect(() => {
    if (base.current === null) setDraft(value);
  }, [value]);
  return {
    draft,
    setDraft,
    // начало правки - фокус в поле
    start: () => {
      if (base.current === null) base.current = draft;
    },
    // конец правки: true - текст меняли, его надо сохранить
    finish: (): boolean => {
      const changed = base.current !== null && draft !== base.current;
      base.current = null;
      if (!changed) setDraft(value);
      return changed;
    },
  };
}
