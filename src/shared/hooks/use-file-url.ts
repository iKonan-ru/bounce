import { useQuery } from '@tanstack/react-query';
import { pb } from '../api/pb';
import { fileTokenQuery } from '../api/queries';
import type { FileUrlGetter } from '../types/files';

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
