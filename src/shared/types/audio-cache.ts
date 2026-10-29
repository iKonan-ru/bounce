/** Загрузка, которая идёт сейчас */
export interface AudioDownload {
  key: string;
  abort: AbortController;
}

/** Ход загрузки: доля скачанного (0..1) */
export type ProgressHandler = (fraction: number) => void;
