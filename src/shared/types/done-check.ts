/** Пропсы отметки "сделано" */
export interface DoneCheckProps {
  checked: boolean;
  /** Подпись отметки для экранного диктора */
  label: string;
  disabled: boolean;
  /** Отметку поставили (true) или сняли (false) */
  onDone: (isDone: boolean) => void;
  className?: string;
}
