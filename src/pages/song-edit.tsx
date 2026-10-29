import { Check, ChevronDown, Star, Trash2, ImagePlus } from 'lucide-react';
import type { ReactNode, RefObject, ChangeEvent } from 'react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAccess } from '@/entities/project';
import type { Song, SongStatus } from '@/entities/song';
import {
  songQuery,
  SONG_STATUS_LABEL,
  getSongStatus,
  MANUAL_SONG_STATUSES,
  KeyPicker,
  getMainCover,
} from '@/entities/song';
import { InlineTitle } from '@/features/mentions';
import {
  getCollection,
  pb,
  Collections,
  queryKeys,
  sendRecordForm,
} from '@/shared/api';
import {
  SAVE_FAILED,
  GROUP_ROWS,
  MAX_IMAGE_BYTES,
  MAX_COVERS,
  IMAGE_ACCEPT,
} from '@/shared/constants';
import { useFileUrl } from '@/shared/hooks';
import type { Crumb } from '@/shared/types';
import {
  PageHeader,
  Loading,
  DropdownMenuItem,
  Section,
  PropRow,
  DropdownMenu,
  DropdownMenuTrigger,
  Button,
  DropdownMenuContent,
  AutosaveInput,
  Progress,
  ConfirmDialog,
  ImageViewer,
} from '@/shared/ui';
import { cn, shrinkImages, warmImages, getFileSizeLabel } from '@/shared/utils';
import { useSongCrumbs } from '@/widgets/page-crumbs';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useParams, Navigate, useNavigate } from '@tanstack/react-router';

/** Правка полей песни из формы */
interface SongPatch extends Partial<
  Pick<Song, 'status' | 'bpm' | 'key' | 'target_release'>
> {}

/** Правка обложек песни: поля записи и их значения */
interface CoversPatch extends Record<string, string> {}

/** Всё, что не цифра: в поле темпа остаются только цифры */
const NON_DIGIT_RE = /\D/g;

/** Самый медленный темп, BPM */
const MIN_BPM = 20;

/** Самый быстрый темп, BPM */
const MAX_BPM = 400;

/** Поле формы, которое добавляет файл к обложкам песни */
const COVERS_APPEND_FIELD = 'covers+';

/** Поле правки, которое убирает файл из обложек песни */
const COVERS_REMOVE_FIELD = 'covers-';

/** Большая копия обложки: плитки и шапка песни */
const COVER_THUMB_LARGE = '600x600';

/** Маленькая копия обложки: списки песен */
const COVER_THUMB_SMALL = '96x96';

/** Множитель доли в проценты */
const PERCENT = 100;

/** Оставить в темпе только цифры */
function filterDigits(value: string): string {
  return value.replace(NON_DIGIT_RE, '');
}

/** Темп можно сохранить: пусто или число в разумных пределах */
function checkIsValidBpm(value: string): boolean {
  if (value === '') {
    return true;
  }

  const bpm = Number(value);

  return bpm >= MIN_BPM && bpm <= MAX_BPM;
}

/** Темп для поля: без темпа - пусто */
function getBpmValue(bpm: number | undefined): string {
  if (!bpm) {
    return '';
  }

  return String(bpm);
}

/** Доля в процентах; без загрузки - null */
function getPercent(fraction: number | null): number | null {
  if (fraction === null) {
    return null;
  }

  return Math.round(fraction * PERCENT);
}

/** Пропсы названия песни в шапке */
interface SongTitleProps {
  /** Название; пока песня не загружена - undefined */
  title: string | undefined;
  onSave: (title: string) => void;
}

/** Название песни в шапке: крупно и правится здесь же */
function SongTitle({ title, onSave }: SongTitleProps): ReactNode {
  if (title === undefined) {
    return '';
  }

  return (
    <InlineTitle
      value={title}
      label="Переименовать песню"
      maxLength={200}
      onSave={onSave}
    />
  );
}

/** Состояние страницы настроек песни */
interface UseSongEditPageResult {
  projectId: string;
  songId: string;
  crumbs: Crumb[];
  /** Не редактор: настройки не для него */
  shouldRedirect: boolean;
  isPending: boolean;
  song: Song | undefined;
  onTitleSave: (title: string) => void;
}

/** Песня, права и переименование */
function useSongEditPage(): UseSongEditPageResult {
  const { projectId, songId } = useParams({
    from: '/app/p/$projectId/songs/$songId/edit',
  });
  const song = useQuery(songQuery(songId));
  const crumbs = useSongCrumbs(projectId, songId);
  const access = useAccess(projectId);
  const client = useQueryClient();
  const rename = useMutation({
    mutationFn: (title: string): Promise<Song> =>
      getCollection(pb, Collections.Songs).update(songId, { title }),
    onSettled: (): Promise<void> =>
      client.invalidateQueries({ queryKey: queryKeys.songs.all }),
    onError: () => {
      toast.error('Название не сохранилось: проверьте соединение');
    },
  });

  const onTitleSave = (title: string): void => {
    rename.mutate(title);
  };

  // настройки песни - только редакторам; остальных - на страницу песни
  const hasRole = Boolean(access.role);
  const shouldRedirect = hasRole && !access.canEdit;

  return {
    projectId,
    songId,
    crumbs,
    shouldRedirect,
    isPending: song.isPending,
    song: song.data,
    onTitleSave,
  };
}

/** Настройки песни: поля, обложки и удаление */
export function SongEditPage(): ReactNode {
  const {
    projectId,
    songId,
    crumbs,
    shouldRedirect,
    isPending,
    song,
    onTitleSave,
  } = useSongEditPage();

  if (shouldRedirect) {
    const songParams = { projectId, songId };

    return <Navigate to="/p/$projectId/songs/$songId" params={songParams} />;
  }

  const title = <SongTitle title={song?.title} onSave={onTitleSave} />;

  return (
    <>
      {/* название - крупно: сразу видно, какую песню настраиваем; правится здесь же */}
      <PageHeader crumbs={crumbs} title={title} meta="Настройки песни" />
      {isPending && <Loading className="h-60 rounded-xl" />}
      {song && (
        <div className="grid max-w-5xl grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-2 lg:gap-12">
          <SongForm song={song} />
          <Covers song={song} />
          <DeleteSong projectId={projectId} song={song} />
        </div>
      )}
    </>
  );
}

/** Пропсы пункта выбора статуса */
interface StatusMenuItemProps {
  status: SongStatus;
  /** Статус, сохранённый в записи песни */
  currentStatus: SongStatus;
  onStatusSelect: (status: SongStatus) => void;
}

/** Пункт меню статуса: выбор другого статуса сохраняет его */
function StatusMenuItem({
  status,
  currentStatus,
  onStatusSelect,
}: StatusMenuItemProps): ReactNode {
  const isCurrent = status === currentStatus;
  const onItemSelect = (): void => {
    if (!isCurrent) {
      onStatusSelect(status);
    }
  };

  return (
    <DropdownMenuItem onSelect={onItemSelect}>
      <span className="flex-1">{SONG_STATUS_LABEL[status]}</span>
      {isCurrent && <Check className="size-4" />}
    </DropdownMenuItem>
  );
}

/** Пропсы формы песни */
interface SongFormProps {
  song: Song;
}

/** Действия формы песни */
interface UseSongFormResult {
  onStatusSelect: (status: SongStatus) => void;
  onBpmSave: (value: string) => void;
  onKeyChange: (key: string) => void;
}

/** Сохранение полей песни */
function useSongForm(song: Song): UseSongFormResult {
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (patch: SongPatch): Promise<Song> =>
      getCollection(pb, Collections.Songs).update(song.id, patch),
    onSettled: (): Promise<void> =>
      client.invalidateQueries({ queryKey: queryKeys.songs.all }),
    onError: () => {
      toast.error(SAVE_FAILED);
    },
  });

  const onStatusSelect = (status: SongStatus): void => {
    save.mutate({ status });
  };

  const onBpmSave = (value: string): void => {
    if (!value) {
      save.mutate({ bpm: 0 });

      return;
    }

    save.mutate({ bpm: Number(value) });
  };

  const onKeyChange = (key: string): void => {
    save.mutate({ key });
  };

  return { onStatusSelect, onBpmSave, onKeyChange };
}

/** Поля песни сохраняются сами: при уходе из поля, выборе статуса или даты */
function SongForm({ song }: SongFormProps): ReactNode {
  const { onStatusSelect, onBpmSave, onKeyChange } = useSongForm(song);
  const statusLabel = SONG_STATUS_LABEL[getSongStatus(song)];
  const bpmValue = getBpmValue(song.bpm);
  const keyValue = song.key ?? '';

  return (
    <Section title="Песня">
      <div className={GROUP_ROWS}>
        <PropRow label="Статус">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="-mr-2 h-9 gap-1.5 px-2 font-normal"
              >
                {statusLabel}
                <ChevronDown className="size-4 text-dim" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              {MANUAL_SONG_STATUSES.map((status) => (
                <StatusMenuItem
                  key={status}
                  status={status}
                  currentStatus={song.status}
                  onStatusSelect={onStatusSelect}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </PropRow>
        <PropRow label="Темп, BPM">
          <AutosaveInput
            id="song-bpm"
            inputMode="numeric"
            placeholder="-"
            maxLength={3}
            value={bpmValue}
            filter={filterDigits}
            validate={checkIsValidBpm}
            onSave={onBpmSave}
          />
        </PropRow>
        <PropRow label="Тональность">
          <KeyPicker value={keyValue} onChange={onKeyChange} />
        </PropRow>
      </div>
    </Section>
  );
}

/** Пропсы плитки обложки */
interface CoverTileProps {
  songTitle: string;
  /** Имя файла обложки */
  cover: string;
  /** Ссылка на большую копию; пока нет токена - undefined */
  url: string | undefined;
  isMain: boolean;
  isBusy: boolean;
  onView: (cover: string) => void;
  onMakeMain: (cover: string) => void;
  onRemove: (cover: string) => void;
}

/** Подписи и обработчики плитки обложки */
interface UseCoverTileResult {
  openLabel: string;
  mainLabel: string;
  isMainDisabled: boolean;
  onViewClick: () => void;
  onMainClick: () => void;
  onRemoveClick: () => void;
}

/** Действия плитки обложки: все - с именем файла обложки */
function useCoverTile({
  songTitle,
  cover,
  isMain,
  isBusy,
  onView,
  onMakeMain,
  onRemove,
}: CoverTileProps): UseCoverTileResult {
  const openLabel = `Открыть обложку: ${songTitle}`;
  const mainLabel = isMain ? 'Основная обложка' : 'Сделать основной';
  const isMainDisabled = isBusy || isMain;

  const onViewClick = (): void => {
    onView(cover);
  };

  const onMainClick = (): void => {
    onMakeMain(cover);
  };

  const onRemoveClick = (): void => {
    onRemove(cover);
  };

  return {
    openLabel,
    mainLabel,
    isMainDisabled,
    onViewClick,
    onMainClick,
    onRemoveClick,
  };
}

/** Плитка обложки: открыть, сделать основной, удалить */
function CoverTile(props: CoverTileProps): ReactNode {
  const { url, isMain, isBusy } = props;
  const {
    openLabel,
    mainLabel,
    isMainDisabled,
    onViewClick,
    onMainClick,
    onRemoveClick,
  } = useCoverTile(props);
  const tileClassName = cn(
    'relative aspect-square overflow-hidden rounded-lg bg-groove',
    {
      'ring-2 ring-led-amber': isMain,
    }
  );
  const starClassName = cn('size-4', {
    'fill-led-amber text-led-amber': isMain,
  });

  return (
    <div className={tileClassName}>
      <button
        type="button"
        aria-label={openLabel}
        onClick={onViewClick}
        className="block size-full cursor-zoom-in transition-[filter] hover:brightness-95"
      >
        {url && <img src={url} alt="" className="size-full object-cover" />}
      </button>
      <div className="absolute inset-x-1 bottom-1 flex justify-between">
        <button
          type="button"
          aria-label={mainLabel}
          aria-pressed={isMain}
          disabled={isMainDisabled}
          onClick={onMainClick}
          className="flex size-8 items-center justify-center rounded-full bg-black/60 text-white"
        >
          <Star className={starClassName} />
        </button>
        <button
          type="button"
          aria-label="Удалить обложку"
          disabled={isBusy}
          onClick={onRemoveClick}
          className="flex size-8 items-center justify-center rounded-full bg-black/60 text-white"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Пропсы обложек песни */
interface CoversProps {
  song: Song;
}

/** Состояние и действия обложек песни */
interface UseCoversResult {
  covers: readonly string[];
  /** Основная обложка */
  mainCover: string | undefined;
  /** Ссылка на большую копию обложки */
  getCoverUrl: (cover: string) => string | undefined;
  fileInputRef: RefObject<HTMLInputElement | null>;
  /** Ход загрузки в процентах; без загрузки - null */
  uploadPercent: number | null;
  isBusy: boolean;
  isAddDisabled: boolean;
  isUpdating: boolean;
  isRemoveOpen: boolean;
  /** Открытая на весь экран обложка */
  viewerSrc: string | undefined;
  viewerDownloadUrl: string | undefined;
  onCoverView: (cover: string) => void;
  onCoverMakeMain: (cover: string) => void;
  onCoverRemove: (cover: string) => void;
  onAddClick: () => void;
  onFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveOpenChange: (isOpen: boolean) => void;
  onRemoveConfirm: () => void;
  onViewerClose: () => void;
}

/** Загрузка, выбор основной, просмотр и удаление обложек */
function useCovers(song: Song): UseCoversResult {
  const client = useQueryClient();
  const fileUrl = useFileUrl();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [viewingCover, setViewingCover] = useState<string | null>(null);
  // какую обложку удалить - после подтверждения
  const [removingCover, setRemovingCover] = useState<string | null>(null);
  const covers = song.covers ?? [];
  const mainCover = getMainCover(song);

  const handleRefresh = (): Promise<void> =>
    client.invalidateQueries({ queryKey: queryKeys.songs.all });

  const upload = useMutation({
    mutationFn: async (files: File[]): Promise<void> => {
      setProgress(0);
      const shrunkFiles = await shrinkImages(files);
      const form = new FormData();
      for (const shrunkFile of shrunkFiles) {
        form.append(COVERS_APPEND_FIELD, shrunkFile);
      }
      const next = await sendRecordForm<Song>(Collections.Songs, form, {
        id: song.id,
        onProgress: setProgress,
      });
      const added = next.covers.filter((cover) => !covers.includes(cover));
      await warmImages([
        ...added.map((cover) => fileUrl(next, cover, COVER_THUMB_LARGE)),
        fileUrl(next, getMainCover(next), COVER_THUMB_SMALL),
      ]);
    },
    onSettled: () => {
      setProgress(null);
    },
    onSuccess: handleRefresh,
    onError: () => {
      toast.error(
        'Обложка не загрузилась: проверьте соединение и размер файла'
      );
    },
  });

  const update = useMutation({
    mutationFn: (patch: CoversPatch): Promise<Song> =>
      getCollection(pb, Collections.Songs).update(song.id, patch),
    onSuccess: handleRefresh,
    onError: () => {
      toast.error(SAVE_FAILED);
    },
  });

  const handleFilesPick = (list: FileList | null): void => {
    const files = Array.from(list ?? []);
    const fittingFiles = files.filter((file) => file.size <= MAX_IMAGE_BYTES);

    if (fittingFiles.length < files.length) {
      toast.error(
        `Обложка больше ${getFileSizeLabel(MAX_IMAGE_BYTES)} не загрузится`
      );
    }

    const freeSlots = MAX_COVERS - covers.length;

    if (fittingFiles.length > freeSlots) {
      toast.error(`Не больше ${MAX_COVERS} обложек`);
    }

    const hasFiles = fittingFiles.length > 0;
    const hasRoom = freeSlots > 0;

    if (hasFiles && hasRoom) {
      upload.mutate(fittingFiles.slice(0, freeSlots));
    }
  };

  const isBusy = upload.isPending || update.isPending;
  const isFull = covers.length >= MAX_COVERS;
  const isAddDisabled = isBusy || isFull;

  const getCoverUrl = (cover: string): string | undefined =>
    fileUrl(song, cover, COVER_THUMB_LARGE);

  const onCoverView = (cover: string): void => {
    setViewingCover(cover);
  };

  const onCoverMakeMain = (cover: string): void => {
    update.mutate({ main_cover: cover });
  };

  const onCoverRemove = (cover: string): void => {
    setRemovingCover(cover);
  };

  const onAddClick = (): void => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onFilesChange = (event: ChangeEvent<HTMLInputElement>): void => {
    handleFilesPick(event.target.files);
    event.target.value = '';
  };

  const onRemoveOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      setRemovingCover(null);
    }
  };

  const onRemoveConfirm = (): void => {
    if (removingCover === null) {
      return;
    }

    const patch: CoversPatch = { [COVERS_REMOVE_FIELD]: removingCover };

    if (removingCover === mainCover) {
      patch.main_cover = '';
    }

    update.mutate(patch, {
      onSuccess: () => {
        setRemovingCover(null);
      },
    });
  };

  const onViewerClose = (): void => {
    setViewingCover(null);
  };

  let viewerSrc: string | undefined;
  let viewerDownloadUrl: string | undefined;

  if (viewingCover) {
    viewerSrc = fileUrl(song, viewingCover);
    viewerDownloadUrl = fileUrl(song, viewingCover, undefined, true);
  }

  return {
    covers,
    mainCover,
    getCoverUrl,
    fileInputRef,
    uploadPercent: getPercent(progress),
    isBusy,
    isAddDisabled,
    isUpdating: update.isPending,
    isRemoveOpen: removingCover !== null,
    viewerSrc,
    viewerDownloadUrl,
    onCoverView,
    onCoverMakeMain,
    onCoverRemove,
    onAddClick,
    onFilesChange,
    onRemoveOpenChange,
    onRemoveConfirm,
    onViewerClose,
  };
}

/** Обложки песни: плитки, добавление, просмотр и удаление */
function Covers({ song }: CoversProps): ReactNode {
  const {
    covers,
    mainCover,
    getCoverUrl,
    fileInputRef,
    uploadPercent,
    isBusy,
    isAddDisabled,
    isUpdating,
    isRemoveOpen,
    viewerSrc,
    viewerDownloadUrl,
    onCoverView,
    onCoverMakeMain,
    onCoverRemove,
    onAddClick,
    onFilesChange,
    onRemoveOpenChange,
    onRemoveConfirm,
    onViewerClose,
  } = useCovers(song);

  return (
    <Section title="Обложки">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {covers.map((cover) => {
          const url = getCoverUrl(cover);
          const isMain = cover === mainCover;

          return (
            <CoverTile
              key={cover}
              songTitle={song.title}
              cover={cover}
              url={url}
              isMain={isMain}
              isBusy={isBusy}
              onView={onCoverView}
              onMakeMain={onCoverMakeMain}
              onRemove={onCoverRemove}
            />
          );
        })}
        <button
          type="button"
          disabled={isAddDisabled}
          onClick={onAddClick}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-sm text-dim transition-colors hover:bg-panel hover:text-ink"
        >
          <ImagePlus className="size-6" strokeWidth={1.5} />
          Добавить
        </button>
      </div>
      {uploadPercent !== null && (
        <Progress
          className="mt-3"
          value={uploadPercent}
          aria-label="Загрузка обложки"
        />
      )}
      <ConfirmDialog
        open={isRemoveOpen}
        onOpenChange={onRemoveOpenChange}
        title="Удалить обложку?"
        description="Файл обложки удалится с сервера."
        confirmLabel="Удалить"
        isBusy={isUpdating}
        onConfirm={onRemoveConfirm}
      />
      <ImageViewer
        src={viewerSrc}
        title={song.title}
        downloadUrl={viewerDownloadUrl}
        onClose={onViewerClose}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        hidden
        onChange={onFilesChange}
      />
    </Section>
  );
}

/** Пропсы удаления песни */
interface DeleteSongProps {
  projectId: string;
  song: Song;
}

/** Состояние удаления песни */
interface UseDeleteSongResult {
  isConfirming: boolean;
  setIsConfirming: (isConfirming: boolean) => void;
  isRemoving: boolean;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
}

/** Удаление песни с подтверждением; после него - на страницу проекта */
function useDeleteSong({
  projectId,
  song,
}: DeleteSongProps): UseDeleteSongResult {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(false);
  const remove = useMutation({
    mutationFn: (): Promise<boolean> =>
      getCollection(pb, Collections.Songs).delete(song.id),
    onSuccess: async () => {
      setIsConfirming(false);
      await navigate({ to: '/p/$projectId', params: { projectId } });
      await client.invalidateQueries({ queryKey: queryKeys.songs.all });
    },
    onError: () => {
      toast.error('Песня не удалена: проверьте соединение');
    },
  });

  const onDeleteClick = (): void => {
    setIsConfirming(true);
  };

  const onDeleteConfirm = (): void => {
    remove.mutate();
  };

  return {
    isConfirming,
    setIsConfirming,
    isRemoving: remove.isPending,
    onDeleteClick,
    onDeleteConfirm,
  };
}

/** Удаление песни: кнопка и подтверждение */
function DeleteSong(props: DeleteSongProps): ReactNode {
  const {
    isConfirming,
    setIsConfirming,
    isRemoving,
    onDeleteClick,
    onDeleteConfirm,
  } = useDeleteSong(props);
  const deleteTitle = `Удалить песню "${props.song.title}"?`;

  return (
    <div className="lg:col-span-2">
      <Button
        variant="ghost"
        className="-ml-3.5 text-led-red hover:bg-led-red/10 hover:text-led-red"
        onClick={onDeleteClick}
      >
        <Trash2 data-icon="inline-start" />
        Удалить песню
      </Button>
      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        title={deleteTitle}
        description="Удалятся этапы, текст, обложки и заметки песни."
        confirmLabel="Удалить"
        isBusy={isRemoving}
        onConfirm={onDeleteConfirm}
      />
    </div>
  );
}
