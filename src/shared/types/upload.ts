/** Метод отправки формы */
export enum FormMethod {
  /** Создать запись */
  Create = 'POST',
  /** Изменить запись */
  Update = 'PATCH',
}

/** Параметры отправки формы */
export interface SendFormOptions {
  /** Параметры адреса запроса */
  query?: Record<string, string>;
  /** Доля отправленного (0..1) */
  onProgress?: (fraction: number) => void;
}

/** Параметры отправки записи с файлами */
export interface SendRecordFormOptions {
  /** Id записи для правки; без него запись создаётся */
  id?: string;
  expand?: string;
  onProgress?: (fraction: number) => void;
}
