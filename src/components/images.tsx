import { type QueryKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Disc3, ImagePlus } from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ImageViewer } from '@/components/image-viewer';
import { errorText } from '@/lib/errors';
import { fileSize } from '@/lib/format';
import { shrinkImage, warmImages } from '@/lib/images';
import { MAX_IMAGE_BYTES, mainCover, type Project, type Song } from '@/lib/model';
import { pb } from '@/lib/pb';
import { fileTokenQuery } from '@/lib/queries';
import { sendRecordForm } from '@/lib/upload';
import { cn } from '@/lib/utils';

export type FileRecord = { id: string; collectionId: string; collectionName: string };

// Картинка в пути на сервер: локальная копия для показа и доля отправленного.
export type PendingImage = { url: string; progress: number };

// Загрузка одной картинки: сразу видна локальная копия с полоской хода, фото уменьшается до
// отправки. upload отправляет файл и дожидается готовых уменьшенных копий (warmImages), чтобы
// после загрузки картинка не пропадала.
export function useImageUpload(
  upload: (file: File, onProgress: (fraction: number) => void) => Promise<unknown>,
  failed: string,
): { pick: (file: File) => void; pending: PendingImage | undefined; busy: boolean } {
  const [pending, setPending] = useState<PendingImage>();
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const url = URL.createObjectURL(file);
      setPending({ url, progress: 0 });
      try {
        const small = await shrinkImage(file);
        if (small.size > MAX_IMAGE_BYTES) {
          throw new RangeError(`Картинка больше ${fileSize(MAX_IMAGE_BYTES)} не загрузится`);
        }
        await upload(small, (progress) => setPending({ url, progress }));
      } finally {
        setPending(undefined);
        URL.revokeObjectURL(url);
      }
    },
    onError: (e) => toast.error(e instanceof RangeError ? e.message : errorText(e, failed)),
  });
  return { pick: (file) => mutation.mutate(file), pending, busy: mutation.isPending };
}

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

// Загрузка картинки в одно поле записи (аватар проекта, аватар пользователя).
export function useFieldUpload<T extends FileRecord>({
  record,
  field,
  thumbs,
  refresh,
  onSaved,
}: {
  record: FileRecord;
  field: string;
  thumbs: ReadonlyArray<string>;
  refresh: QueryKey;
  onSaved?: (next: T) => void;
}) {
  const client = useQueryClient();
  const fileUrl = useFileUrl();
  return useImageUpload(async (file, onProgress) => {
    const form = new FormData();
    form.set(field, file);
    const next = await sendRecordForm<T & Record<string, unknown>>(record.collectionName, form, {
      id: record.id,
      onProgress,
    });
    const name = next[field];
    if (typeof name === 'string') await warmImages(thumbs.map((t) => fileUrl(next, name, t)));
    onSaved?.(next);
    await client.invalidateQueries({ queryKey: refresh });
  }, 'Картинка не загрузилась: проверьте соединение');
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
  pending?: PendingImage | undefined;
  // загруженная открывается на весь экран со скачиванием оригинала; аватарам и обложкам не нужно
  zoom?: boolean;
  className?: string;
};

// Картинка-место: по пустой - выбор файла; загруженная с zoom открывается на весь экран.
export function ImageSlot({
  record,
  file,
  thumb,
  title,
  placeholder,
  onPick,
  accept = 'image/*',
  pending,
  zoom = true,
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

  if (pending) {
    return (
      <span role="status" aria-label={`Загрузка: ${title}`} className={cn(base, 'relative')}>
        <img src={pending.url} alt="" className="size-full object-cover opacity-70" />
        <span className="absolute inset-x-[12%] bottom-[12%] h-1 overflow-hidden rounded-full bg-black/40">
          <span
            className={cn(
              'block h-full rounded-full bg-white transition-[width]',
              pending.progress >= 1 && 'animate-pulse',
            )}
            style={{ width: `${Math.max(4, Math.round(pending.progress * 100))}%` }}
          />
        </span>
      </span>
    );
  }
  if ((!file && !onPick) || (file && !zoom)) {
    return (
      <span aria-hidden="true" className={base}>
        {url ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : file ? null : (
          placeholder
        )}
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

// Аватар проекта: загруженная картинка или плашка с первой буквой названия; interactive - по
// пустой загрузка.
export function ProjectAvatar({
  project,
  className,
  onPick,
  pending,
  interactive,
}: {
  project: Project;
  className?: string;
  onPick?: ((file: File) => void) | undefined;
  pending?: PendingImage | undefined;
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
        pending={pending}
        zoom={false}
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

// Основная обложка песни; без обложки - значок пластинки; interactive (шапка песни) - по пустой
// загрузка.
export function SongCover({
  song,
  size = 'sm',
  className,
  onPick,
  pending,
  interactive,
}: {
  song: Song;
  size?: 'sm' | 'lg';
  className?: string;
  onPick?: ((file: File) => void) | undefined;
  pending?: PendingImage | undefined;
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
        pending={pending}
        zoom={false}
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
