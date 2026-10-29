import type { Dispatch, SetStateAction } from 'react';

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
