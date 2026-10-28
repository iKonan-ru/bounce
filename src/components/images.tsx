import { useQuery } from '@tanstack/react-query';
import { Disc3, ImagePlus } from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import { ImageViewer } from '@/components/image-viewer';
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
  download?: boolean,
) => string | undefined {
  const token = useQuery(fileTokenQuery);
  return (record, file, thumb, download) =>
    token.data && file
      ? pb.files.getURL(record, file, {
          token: token.data,
          ...(thumb ? { thumb } : {}),
          ...(download ? { download: true } : {}),
        })
      : undefined;
}

type SlotProps = {
  record: FileRecord;
  file: string | undefined;
  thumb: string;
  title: string;
  placeholder: ReactNode;
  // выбор файла по нажатию на пустое место; без него пустое место не нажимается
  onPick?: ((file: File) => void) | undefined;
  accept?: string;
  className?: string;
};

// Картинка-место: загруженная открывается на весь экран (со скачиванием оригинала), по пустой -
// выбор файла.
export function ImageSlot({
  record,
  file,
  thumb,
  title,
  placeholder,
  onPick,
  accept = 'image/*',
  className,
}: SlotProps) {
  const fileUrl = useFileUrl();
  const input = useRef<HTMLInputElement>(null);
  const [viewing, setViewing] = useState(false);
  const url = fileUrl(record, file, thumb);
  const base = cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden bg-groove text-dim',
    className,
  );

  if (!file && !onPick) {
    return (
      <span aria-hidden="true" className={base}>
        {placeholder}
      </span>
    );
  }
  return (
    <>
      <button
        type="button"
        aria-label={file ? `Открыть: ${title}` : `Загрузить: ${title}`}
        onClick={() => (file ? setViewing(true) : input.current?.click())}
        className={cn(
          base,
          'group/slot relative transition-[filter,background-color]',
          file ? 'cursor-zoom-in hover:brightness-95' : 'hover:bg-groove/70 hover:text-ink',
        )}
      >
        {url ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : file ? null : (
          <span className="flex flex-col items-center gap-1">
            <span className="group-hover/slot:hidden">{placeholder}</span>
            <ImagePlus className="hidden size-5 group-hover/slot:block" />
          </span>
        )}
      </button>
      {onPick && (
        <input
          ref={input}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            e.target.value = '';
          }}
        />
      )}
      <ImageViewer
        src={viewing ? fileUrl(record, file) : undefined}
        title={title}
        downloadUrl={fileUrl(record, file, undefined, true)}
        onClose={() => setViewing(false)}
      />
    </>
  );
}

// Аватар проекта: загруженная картинка или плашка с первой буквой названия. В списках и
// навигации - просто картинка; interactive - открывается на весь экран, пустая - загрузка.
export function ProjectAvatar({
  project,
  className,
  onPick,
  interactive,
}: {
  project: Project;
  className?: string;
  onPick?: ((file: File) => void) | undefined;
  interactive?: boolean;
}) {
  const fileUrl = useFileUrl();
  const cls = cn('size-10 rounded-lg font-semibold', className);
  const letter = (
    <span className="font-semibold text-ink">{project.name.trim().charAt(0).toUpperCase()}</span>
  );
  if (interactive) {
    return (
      <ImageSlot
        record={project}
        file={project.avatar || undefined}
        thumb="256x256"
        title={project.name}
        onPick={onPick}
        placeholder={letter}
        className={cls}
      />
    );
  }
  const url = fileUrl(project, project.avatar || undefined, '256x256');
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden bg-groove',
        cls,
      )}
    >
      {url ? <img src={url} alt="" className="size-full object-cover" /> : letter}
    </span>
  );
}

// Основная обложка песни; без обложки - значок пластинки. В списках - просто картинка,
// в шапке песни (interactive) - открывается на весь экран, пустая - загрузка.
export function SongCover({
  song,
  size = 'sm',
  className,
  onPick,
  interactive,
}: {
  song: Song;
  size?: 'sm' | 'lg';
  className?: string;
  onPick?: ((file: File) => void) | undefined;
  interactive?: boolean;
}) {
  const fileUrl = useFileUrl();
  const file = mainCover(song);
  const cls = cn(size === 'lg' ? 'size-20 rounded-xl md:size-28' : 'size-12 rounded-lg', className);
  const placeholder = <Disc3 className={size === 'lg' ? 'size-10' : 'size-5'} strokeWidth={1.5} />;
  if (interactive) {
    return (
      <ImageSlot
        record={song}
        file={file}
        thumb={size === 'lg' ? '600x600' : '96x96'}
        title={song.title}
        onPick={onPick}
        placeholder={placeholder}
        className={cls}
      />
    );
  }
  const url = fileUrl(song, file, size === 'lg' ? '600x600' : '96x96');
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden bg-groove text-dim',
        cls,
      )}
    >
      {url ? <img src={url} alt="" className="size-full object-cover" /> : placeholder}
    </span>
  );
}
