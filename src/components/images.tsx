import { Disc3, ImagePlus, X } from 'lucide-react';
import {
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { ImageViewer } from '@/components/image-viewer';
import { getErrorText } from '@/lib/errors';
import { getFileSizeLabel } from '@/lib/format';
import { getField } from '@/lib/guards';
import { shrinkImage, warmImages } from '@/lib/images';
import { IMAGE_ACCEPT, MAX_IMAGE_BYTES } from '@/lib/limits';
import type { FileRecord, Project, Song } from '@/lib/model';
import { pb } from '@/lib/pb';
import { fileTokenQuery } from '@/lib/queries';
import { getMainCover } from '@/lib/songs';
import { sendRecordForm } from '@/lib/upload';
import { cn } from '@/lib/utils';
import {
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

/** Картинка в пути на сервер: локальная копия для показа и доля отправленного */
export interface PendingImage {
  url: string;
  /** Доля отправленного (0..1) */
  progress: number;
}

/** Отправка картинки: файл и обработчик хода отправки */
type ImageUploader = (
  file: File,
  onProgress: (fraction: number) => void
) => Promise<unknown>;

/** Загрузка одной картинки */
interface UseImageUploadResult {
  /** Начать загрузку выбранного файла */
  pick: (file: File) => void;
  /** Картинка в пути на сервер; без загрузки - undefined */
  pending: PendingImage | undefined;
  isBusy: boolean;
}

/** Ссылка на закрытый файл записи: с токеном, пока он не получен - undefined */
type FileUrlGetter = (
  record: FileRecord,
  file: string | undefined,
  thumb?: string,
  shouldDownload?: boolean
) => string | undefined;

/** Параметры загрузки картинки в одно поле записи */
interface UseFieldUploadParams<Saved extends FileRecord> {
  record: FileRecord;
  /** Поле записи с картинкой */
  field: string;
  /** Уменьшенные копии, которые нужны сразу после загрузки */
  thumbs: readonly string[];
  /** Ключ запросов, которые перечитываются после загрузки */
  refresh: QueryKey;
  /** Запись сохранена: получает её новую версию */
  onSaved?: (next: Saved) => void;
}

/** Пропсы картинки-места */
interface ImageSlotProps {
  record: FileRecord;
  file: string | undefined;
  thumb: string;
  title: string;
  placeholder: ReactNode;
  /** Выбор файла по нажатию на пустое место; без него пустое место не нажимается */
  onPick?: ((file: File) => void) | undefined;
  accept?: string;
  pending?: PendingImage | undefined;
  /** Загруженная открывается на весь экран со скачиванием оригинала; аватару проекта не нужно */
  canZoom?: boolean;
  /** Загруженную можно заменить нажатием (вместо открытия на весь экран) */
  canReplace?: boolean;
  /** Крестик над картинкой: убрать её */
  onRemove?: (() => void) | undefined;
  className?: string;
}

/** Пропсы картинки в пути на сервер */
interface PendingSlotProps {
  pending: PendingImage;
  title: string;
  /** Классы места картинки */
  slotClassName: string;
}

/** Действие по нажатию на картинку-место и подсветка при наведении */
interface SlotLook {
  /** Подпись действия для экранного диктора */
  action: string;
  hoverClassName: string;
}

/** Состояние и обработчики картинки-места */
interface UseImageSlotResult {
  inputRef: RefObject<HTMLInputElement | null>;
  slotClassName: string;
  /** Загруженная картинка; пока ссылки нет - null */
  image: ReactNode;
  /** Файла нет вовсе - на месте картинки подсказка */
  showPlaceholder: boolean;
  /** Загруженную картинку нажатием заменяют новой */
  canPickFilled: boolean;
  /** Картинку не нажать: пустая без выбора файла или загруженная без действия */
  isStatic: boolean;
  showRemove: boolean;
  buttonLabel: string;
  removeLabel: string;
  buttonClassName: string;
  viewerSrc: string | undefined;
  downloadUrl: string | undefined;
  onSlotClick: () => void;
  onFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onViewerClose: () => void;
}

/** Пропсы аватара проекта */
interface ProjectAvatarProps {
  project: Project;
  className?: string;
  onPick?: ((file: File) => void) | undefined;
  pending?: PendingImage | undefined;
  /** По пустой - загрузка */
  isInteractive?: boolean;
  /** Загруженную картинку заменить нажатием */
  canReplace?: boolean;
  /** Крестик над картинкой: убрать её */
  onRemove?: (() => void) | undefined;
}

/** Размер обложки песни */
export enum SongCoverSize {
  /** В списках */
  Small = 'sm',
  /** В шапке песни */
  Large = 'lg',
}

/** Пропсы обложки песни */
interface SongCoverProps {
  song: Song;
  /** Значения SongCoverSize; строкой - пока страницы передают размер литералом */
  size?: SongCoverSize;
  className?: string;
  onPick?: ((file: File) => void) | undefined;
  pending?: PendingImage | undefined;
  /** Шапка песни: по пустой - загрузка, загруженная открывается на весь экран */
  isInteractive?: boolean;
}

/** Текст ошибки загрузки картинки в поле записи */
const FIELD_UPLOAD_FAILED = 'Картинка не загрузилась: проверьте соединение';

/** Общие классы места картинки */
const SLOT_CLASS_NAME =
  'inline-flex shrink-0 items-center justify-center overflow-hidden bg-groove text-dim';

/** Процентов в целом */
const PERCENT = 100;

/** Наименьшая видимая ширина полоски хода, в процентах */
const MIN_PROGRESS_PERCENT = 4;

/** Размер уменьшенной копии аватара проекта */
const PROJECT_AVATAR_THUMB = '256x256';

/** Уменьшенная копия обложки песни по размеру */
const SONG_COVER_THUMB: Record<SongCoverSize, string> = {
  [SongCoverSize.Small]: '96x96',
  [SongCoverSize.Large]: '600x600',
};

/** Значок пластинки без обложки по размеру */
const SONG_COVER_ICON_CLASS_NAME: Record<SongCoverSize, string> = {
  [SongCoverSize.Small]: 'size-5',
  [SongCoverSize.Large]: 'size-10',
};

/**
 * Загрузка одной картинки: сразу видна локальная копия с полоской хода, фото уменьшается до
 * отправки
 *
 * upload отправляет файл и дожидается готовых уменьшенных копий (warmImages), чтобы после
 * загрузки картинка не пропадала; failureText - текст ошибки, если причина неизвестна
 */
export function useImageUpload(
  upload: ImageUploader,
  failureText: string
): UseImageUploadResult {
  const [pending, setPending] = useState<PendingImage>();
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const url = URL.createObjectURL(file);
      setPending({ url, progress: 0 });
      try {
        const shrunkFile = await shrinkImage(file);

        if (shrunkFile.size > MAX_IMAGE_BYTES) {
          throw new RangeError(
            `Картинка больше ${getFileSizeLabel(MAX_IMAGE_BYTES)} не загрузится`
          );
        }

        await upload(shrunkFile, (progress) => setPending({ url, progress }));
      } finally {
        setPending(undefined);
        URL.revokeObjectURL(url);
      }
    },
    onError: (error) => {
      if (error instanceof RangeError) {
        toast.error(error.message);

        return;
      }

      toast.error(getErrorText(error, failureText));
    },
  });
  const pick = (file: File): void => {
    mutation.mutate(file);
  };

  return { pick, pending, isBusy: mutation.isPending };
}

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

/** Загрузка картинки в одно поле записи (аватар проекта, аватар пользователя) */
export function useFieldUpload<Saved extends FileRecord>({
  record,
  field,
  thumbs,
  refresh,
  onSaved,
}: UseFieldUploadParams<Saved>): UseImageUploadResult {
  const client = useQueryClient();
  const fileUrl = useFileUrl();
  const uploadToField: ImageUploader = async (file, onProgress) => {
    const form = new FormData();
    form.set(field, file);
    const next = await sendRecordForm<Saved>(record.collectionName, form, {
      id: record.id,
      onProgress,
    });
    const name = getField(next, field);

    if (typeof name === 'string') {
      await warmImages(thumbs.map((thumb) => fileUrl(next, name, thumb)));
    }

    if (onSaved) {
      onSaved(next);
    }

    await client.invalidateQueries({ queryKey: refresh });
  };

  return useImageUpload(uploadToField, FIELD_UPLOAD_FAILED);
}

/** Действие по нажатию: открыть загруженную, заменить её или загрузить новую */
function getSlotLook(isOpening: boolean, hasFile: boolean): SlotLook {
  if (isOpening) {
    return {
      action: 'Открыть',
      hoverClassName: 'cursor-zoom-in hover:brightness-95',
    };
  }

  if (hasFile) {
    return { action: 'Заменить', hoverClassName: 'hover:brightness-90' };
  }

  return {
    action: 'Загрузить',
    hoverClassName: 'hover:bg-groove/70 hover:text-ink',
  };
}

/** Картинка в пути на сервер: локальная копия с полоской хода */
function PendingSlot({
  pending,
  title,
  slotClassName,
}: PendingSlotProps): ReactNode {
  const statusLabel = `Загрузка: ${title}`;
  const pendingClassName = cn(slotClassName, 'relative');
  const isSent = pending.progress >= 1;
  const barClassName = cn(
    'block h-full rounded-full bg-white transition-[width]',
    {
      'animate-pulse': isSent,
    }
  );
  const progressPercent = Math.max(
    MIN_PROGRESS_PERCENT,
    Math.round(pending.progress * PERCENT)
  );
  const barStyle: CSSProperties = { width: `${progressPercent}%` };

  return (
    <span role="status" aria-label={statusLabel} className={pendingClassName}>
      <img
        src={pending.url}
        alt=""
        className="size-full object-cover opacity-70"
      />
      <span className="absolute inset-x-[12%] bottom-[12%] h-1 overflow-hidden rounded-full bg-black/40">
        <span className={barClassName} style={barStyle} />
      </span>
    </span>
  );
}

/** Что показать в картинке-месте и что делать по нажатию */
function useImageSlot({
  record,
  file,
  thumb,
  title,
  onPick,
  canZoom = true,
  canReplace = false,
  onRemove,
  className,
}: Omit<
  ImageSlotProps,
  'placeholder' | 'accept' | 'pending'
>): UseImageSlotResult {
  const fileUrl = useFileUrl();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isViewing, setIsViewing] = useState(false);
  const url = fileUrl(record, file, thumb);
  const slotClassName = cn(SLOT_CLASS_NAME, className);

  const hasFile = Boolean(file);
  const canPickFilled = Boolean(file && canReplace && onPick);
  const image = url ? (
    <img src={url} alt="" className="size-full object-cover" />
  ) : null;
  const showPlaceholder = !url && !file;
  const isEmptyStatic = !file && !onPick;
  const isFilledStatic = hasFile && !canZoom && !canPickFilled;
  const isStatic = isEmptyStatic || isFilledStatic;
  const isOpening = hasFile && !canPickFilled;
  const showRemove = Boolean(file && onRemove);
  const { action, hoverClassName } = getSlotLook(isOpening, hasFile);
  const buttonLabel = `${action}: ${title}`;
  const removeLabel = `Убрать: ${title}`;
  const buttonClassName = cn(
    slotClassName,
    'group/slot relative transition-[filter,background-color]',
    hoverClassName
  );
  let viewerSrc: string | undefined;

  if (isViewing) {
    viewerSrc = fileUrl(record, file);
  }

  const downloadUrl = fileUrl(record, file, undefined, true);

  const onSlotClick = (): void => {
    if (isOpening) {
      setIsViewing(true);

      return;
    }

    if (inputRef.current) {
      inputRef.current.click();
    }
  };
  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const pickedFile = event.target.files?.[0];

    if (pickedFile) {
      // поле выбора файла есть только с onPick
      if (onPick) {
        onPick(pickedFile);
      }
    }

    event.target.value = '';
  };
  const onViewerClose = (): void => {
    setIsViewing(false);
  };

  return {
    inputRef,
    slotClassName,
    image,
    showPlaceholder,
    canPickFilled,
    isStatic,
    showRemove,
    buttonLabel,
    removeLabel,
    buttonClassName,
    viewerSrc,
    downloadUrl,
    onSlotClick,
    onFileInputChange,
    onViewerClose,
  };
}

/**
 * Картинка-место: по пустой - выбор файла; загруженная с zoom открывается на весь экран, с
 * replace - заменяется новой; крестик сверху (onRemove) убирает картинку
 */
export function ImageSlot(props: ImageSlotProps): ReactNode {
  const {
    title,
    placeholder,
    onPick,
    accept = IMAGE_ACCEPT,
    pending,
    onRemove,
  } = props;
  const {
    inputRef,
    slotClassName,
    image,
    showPlaceholder,
    canPickFilled,
    isStatic,
    showRemove,
    buttonLabel,
    removeLabel,
    buttonClassName,
    viewerSrc,
    downloadUrl,
    onSlotClick,
    onFileInputChange,
    onViewerClose,
  } = useImageSlot(props);

  if (pending) {
    return (
      <PendingSlot
        pending={pending}
        title={title}
        slotClassName={slotClassName}
      />
    );
  }

  if (isStatic) {
    return (
      <span aria-hidden="true" className={slotClassName}>
        {image}
        {showPlaceholder && placeholder}
      </span>
    );
  }

  return (
    <>
      <span className="relative inline-flex shrink-0">
        <button
          type="button"
          aria-label={buttonLabel}
          onClick={onSlotClick}
          className={buttonClassName}
        >
          {image}
          {showPlaceholder && (
            <span className="flex flex-col items-center gap-1">
              <span className="group-hover/slot:hidden">{placeholder}</span>
              <ImagePlus className="hidden size-5 group-hover/slot:block" />
            </span>
          )}
          {canPickFilled && (
            <span className="absolute inset-0 hidden items-center justify-center bg-black/35 text-white group-hover/slot:flex">
              <ImagePlus className="size-5" />
            </span>
          )}
        </button>
        {showRemove && (
          <button
            type="button"
            aria-label={removeLabel}
            onClick={onRemove}
            className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-panel text-dim shadow-sm ring-1 ring-border transition-colors hover:text-ink"
          >
            <X className="size-3" />
          </button>
        )}
      </span>
      {onPick && (
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={onFileInputChange}
        />
      )}
      <ImageViewer
        src={viewerSrc}
        title={title}
        downloadUrl={downloadUrl}
        onClose={onViewerClose}
      />
    </>
  );
}

/**
 * Аватар проекта: загруженная картинка или плашка с первой буквой названия
 *
 * isInteractive - по пустой загрузка
 */
export function ProjectAvatar({
  project,
  className,
  onPick,
  pending,
  isInteractive,
  canReplace = false,
  onRemove,
}: ProjectAvatarProps): ReactNode {
  const fileUrl = useFileUrl();
  const avatarClassName = cn('size-10 rounded-lg font-semibold', className);
  const file = project.avatar || undefined;
  const initial = project.name.trim().charAt(0).toUpperCase();
  const letter = <span className="font-semibold text-ink">{initial}</span>;

  if (isInteractive) {
    return (
      <ImageSlot
        record={project}
        file={file}
        thumb={PROJECT_AVATAR_THUMB}
        title={project.name}
        onPick={onPick}
        pending={pending}
        canZoom={false}
        canReplace={canReplace}
        onRemove={onRemove}
        placeholder={letter}
        className={avatarClassName}
      />
    );
  }

  const url = fileUrl(project, file, PROJECT_AVATAR_THUMB);
  const staticClassName = cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden bg-groove',
    avatarClassName
  );

  return (
    <span aria-hidden="true" className={staticClassName}>
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        letter
      )}
    </span>
  );
}

/**
 * Основная обложка песни; без обложки - значок пластинки
 *
 * interactive (шапка песни) - по пустой загрузка, загруженная открывается на весь экран
 */
export function SongCover({
  song,
  size = SongCoverSize.Small,
  className,
  onPick,
  pending,
  isInteractive,
}: SongCoverProps): ReactNode {
  const fileUrl = useFileUrl();
  const file = getMainCover(song);
  const isLarge = size === SongCoverSize.Large;
  const coverClassName = cn(
    {
      'size-20 rounded-xl md:size-28': isLarge,
      'size-12 rounded-lg': !isLarge,
    },
    className
  );
  const thumb = SONG_COVER_THUMB[size];
  const iconClassName = SONG_COVER_ICON_CLASS_NAME[size];
  const placeholder = <Disc3 className={iconClassName} strokeWidth={1.5} />;

  if (isInteractive) {
    return (
      <ImageSlot
        record={song}
        file={file}
        thumb={thumb}
        title={song.title}
        onPick={onPick}
        pending={pending}
        placeholder={placeholder}
        className={coverClassName}
      />
    );
  }

  const url = fileUrl(song, file, thumb);
  const staticClassName = cn(SLOT_CLASS_NAME, coverClassName);

  return (
    <span aria-hidden="true" className={staticClassName}>
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        placeholder
      )}
    </span>
  );
}
