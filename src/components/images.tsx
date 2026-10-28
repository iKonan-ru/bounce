import { useQuery } from '@tanstack/react-query';
import { Disc3 } from 'lucide-react';
import { mainCover, type Project, type Song } from '@/lib/model';
import { pb } from '@/lib/pb';
import { fileTokenQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

type FileRecord = { id: string; collectionId: string; collectionName: string };

// ссылка на закрытый файл записи: с токеном, пока он не получен - undefined
export function useFileUrl(): (
  record: FileRecord,
  file: string | undefined,
  thumb?: string,
) => string | undefined {
  const token = useQuery(fileTokenQuery);
  return (record, file, thumb) =>
    token.data && file
      ? pb.files.getURL(record, file, { token: token.data, ...(thumb ? { thumb } : {}) })
      : undefined;
}

// Аватар проекта: загруженная картинка или плашка с первой буквой названия.
export function ProjectAvatar({ project, className }: { project: Project; className?: string }) {
  const url = useFileUrl()(project, project.avatar, '256x256');
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-groove font-semibold',
        className,
      )}
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        project.name.trim().charAt(0).toUpperCase()
      )}
    </span>
  );
}

// Основная обложка песни; без обложки - значок пластинки.
export function SongCover({
  song,
  size = 'sm',
  className,
}: {
  song: Song;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const url = useFileUrl()(song, mainCover(song), size === 'lg' ? '600x600' : '96x96');
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden bg-groove text-dim',
        size === 'lg' ? 'size-20 rounded-xl md:size-28' : 'size-12 rounded-lg',
        className,
      )}
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <Disc3 className={size === 'lg' ? 'size-10' : 'size-5'} strokeWidth={1.5} />
      )}
    </span>
  );
}
