import type { FileRecord } from './records';

/** Ссылка на закрытый файл записи: с токеном, пока он не получен - undefined */
export type FileUrlGetter = (
  record: FileRecord,
  file: string | undefined,
  thumb?: string,
  shouldDownload?: boolean
) => string | undefined;
