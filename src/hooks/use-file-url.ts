import type { FileRecord } from '@/lib/model';
import { pb } from '@/lib/pb';
import { fileTokenQuery } from '@/lib/queries';
import { useQuery } from '@tanstack/react-query';

/** Ссылка на закрытый файл записи: с токеном, пока он не получен - undefined */
export type FileUrlGetter = (
  record: FileRecord,
  file: string | undefined,
  thumb?: string,
  shouldDownload?: boolean
) => string | undefined;

/** Ссылка на закрытый файл записи: с токеном, пока он не получен - undefined */
export function useFileUrl(): FileUrlGetter {
  const token = useQuery(fileTokenQuery);

  return (record, file, thumb, shouldDownload) => {
    if (!token.data) {
      return undefined;
    }

    if (!file) {
      return undefined;
    }

    const query: Record<string, string | boolean> = { token: token.data };

    if (thumb) {
      query.thumb = thumb;
    }

    if (shouldDownload) {
      query.download = true;
    }

    return pb.files.getURL(record, file, query);
  };
}
