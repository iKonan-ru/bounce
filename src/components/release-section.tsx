import {
  ImagePlus,
  Download,
  Check,
  ChevronRight,
  Send,
  AudioLines,
} from 'lucide-react';
import type { RefObject, ChangeEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { getReleaseCoverProblem } from '@/lib/images';
import type { Song } from '@/lib/model';
import { SongStatus } from '@/lib/model';
import type { AudioMeta } from '@/lib/player';
import { projectQuery } from '@/lib/queries';
import {
  getSongStatus,
  getReleaseMissing,
  RELEASE_COVER_SIZE,
} from '@/lib/release';
import { getMainCover } from '@/lib/songs';
import {
  queryKeys,
  getCollection,
  pb,
  Collections,
  getErrorText,
  sendRecordForm,
} from '@/shared/api';
import {
  SAVE_FAILED,
  MAX_COVERS,
  GROUP_ROWS,
  RELEASE_COVER_ACCEPT,
  MAX_RELEASE_AUDIO_BYTES,
  RELEASE_AUDIO_ACCEPT,
} from '@/shared/constants';
import { useFileUrl } from '@/shared/hooks';
import {
  Section,
  PropRow,
  DateField,
  ImageSlot,
  Button,
  Progress,
  AutosaveInput,
  ConfirmDialog,
} from '@/shared/ui';
import {
  getSafeUrl,
  shrinkImage,
  warmImages,
  getDateLabel,
  cn,
  getFileSizeLabel,
  getDisplayFileName,
} from '@/shared/utils';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AudioPlayer } from './audio-player';

/** Файл не подходит для релиза: причина - для человека */
class FileProblem extends Error {}

/** Правка полей релиза песни */
type ReleasePatch = Partial<
  Pick<Song, 'status' | 'target_release' | 'bandlink'>
>;

/** Пропсы блока релиза */
interface ReleaseSectionProps {
  projectId: string;
  song: Song;
  /** Можно менять релиз; без этого - только смотреть и скачать обложку */
  isEditable: boolean;
}

/** Состояние и обработчики блока релиза */
interface UseReleaseSectionResult {
  coverInputRef: RefObject<HTMLInputElement | null>;
  isSent: boolean;
  isOnLabel: boolean;
  isReleased: boolean;
  targetRelease: string;
  releaseDateLabel: string;
  releaseCover: string | undefined;
  coverTitle: string;
  coverMissingNote: string;
  coverDownloadUrl: string | undefined;
  coverActionLabel: string;
  canUploadCover: boolean;
  isCoverUploadPending: boolean;
  isCoverUploading: boolean;
  coverProgressPercent: number;
  hasLyrics: boolean;
  bandlinkHref: string | undefined;
  bandlinkValue: string;
  showBandlinkLink: boolean;
  canEditBandlink: boolean;
  showNotSentNote: boolean;
  canSend: boolean;
  sendNote: string;
  hasMissing: boolean;
  isSendDisabled: boolean;
  isSavePending: boolean;
  releasePlanNote: string;
  releasedDateSuffix: string;
  onCoverPick: ((file: File) => void) | undefined;
  onReleaseDateChange: (targetRelease: string) => void;
  onCoverUploadClick: () => void;
  onCoverInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBandlinkSave: (bandlink: string) => void;
  onSendClick: () => void;
  onCancelSendClick: () => void;
}

/** Пропсы финальной версии трека */
interface ReleaseAudioProps {
  song: Song;
  isEditable: boolean;
  /** Песня отправлена на лейбл: трек уже не убрать */
  isSent: boolean;
}

/** Состояние и обработчики финальной версии трека */
interface UseReleaseAudioResult {
  audioInputRef: RefObject<HTMLInputElement | null>;
  file: string | undefined;
  name: string;
  isHidden: boolean;
  isUploadPending: boolean;
  isUploading: boolean;
  progressPercent: number;
  /** Файл для плеера; пока идёт загрузка - undefined */
  playerFile: string | undefined;
  audioMeta: AudioMeta;
  isRemoving: boolean;
  setIsRemoving: (isRemoving: boolean) => void;
  isRemovePending: boolean;
  onReplace: (() => void) | undefined;
  onRemove: (() => void) | undefined;
  onAudioUploadClick: () => void;
  onAudioInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveConfirm: () => void;
}

/** Поля записи песни без финальной версии трека */
interface ClearedReleaseAudio {
  release_audio: null;
  release_audio_name: string;
}

/** Поле обложки для релиза */
const RELEASE_COVER_FIELD = 'release_cover';

/** Добавление файла в галерею обложек песни */
const COVERS_APPEND_FIELD = 'covers+';

/** Поле финальной версии трека */
const RELEASE_AUDIO_FIELD = 'release_audio';

/** Поле исходного имени финальной версии */
const RELEASE_AUDIO_NAME_FIELD = 'release_audio_name';

/** Наибольшая длина исходного имени финальной версии */
const RELEASE_AUDIO_NAME_MAX = 300;

/** Уменьшенная копия обложки в галерее */
const COVER_THUMB = '600x600';

/** Уменьшенная копия основной обложки в списках */
const SMALL_COVER_THUMB = '96x96';

/** Процентов в целом */
const PERCENT = 100;

/** Адрес bandlink: http(s) без пробелов */
const BANDLINK_RE = /^https?:\/\/\S+$/;

/** Типы файлов WAV и MP3 */
const RELEASE_AUDIO_TYPE_RE = /^audio\/(wav|x-wav|wave|vnd\.wave|mpeg|mp3)$/;

/** Расширения файлов WAV и MP3 */
const RELEASE_AUDIO_EXTENSION_RE = /\.(wav|mp3)$/i;

/** Правка, которая убирает финальную версию трека */
const CLEARED_RELEASE_AUDIO: ClearedReleaseAudio = {
  release_audio: null,
  release_audio_name: '',
};

/** Bandlink можно оставить пустым или указать адрес http(s) */
function checkIsBandlinkValid(value: string): boolean {
  if (value === '') {
    return true;
  }

  return BANDLINK_RE.test(value);
}

/** WAV или MP3: по типу, а если браузер его не назвал - по расширению */
function checkIsReleaseAudio(file: File): boolean {
  const isAudioType = RELEASE_AUDIO_TYPE_RE.test(file.type);
  const hasAudioExtension = RELEASE_AUDIO_EXTENSION_RE.test(file.name);

  return isAudioType || hasAudioExtension;
}

/** Данные, правки и загрузка обложки блока релиза */
function useReleaseSection({
  song,
  isEditable,
}: Pick<ReleaseSectionProps, 'song' | 'isEditable'>): UseReleaseSectionResult {
  const client = useQueryClient();
  const fileUrl = useFileUrl();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const status = getSongStatus(song);
  const isOnLabel = status === SongStatus.sent;
  const isReleased = status === SongStatus.released;
  const isSent = isOnLabel || isReleased;
  const missing = getReleaseMissing(song);
  // только http(s): адрес приходит из записи, а не из формы
  const bandlinkHref = getSafeUrl(song.bandlink ?? '') ?? undefined;
  const refreshSongs = (): Promise<void> =>
    client.invalidateQueries({ queryKey: queryKeys.songs.all });

  const save = useMutation({
    mutationFn: (patch: ReleasePatch) =>
      getCollection(pb, Collections.Songs).update(song.id, patch),
    onSettled: refreshSongs,
    onError: (error) => toast.error(getErrorText(error, SAVE_FAILED)),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const problem = await getReleaseCoverProblem(file);

      if (problem) {
        throw new FileProblem(problem);
      }

      const form = new FormData();
      // обложка для релиза хранится как есть, а её копия попадает в галерею обложек песни -
      // уменьшенной, как все обложки галереи; галерея полна - копии нет
      form.set(RELEASE_COVER_FIELD, file);
      const covers = song.covers ?? [];

      if (covers.length < MAX_COVERS) {
        form.append(COVERS_APPEND_FIELD, await shrinkImage(file));
      }

      setProgress(0);
      const next = await sendRecordForm<Song>(Collections.Songs, form, {
        id: song.id,
        onProgress: setProgress,
      });
      const added = (next.covers ?? []).filter(
        (cover) => !covers.includes(cover)
      );
      await warmImages([
        ...added.map((cover) => fileUrl(next, cover, COVER_THUMB)),
        fileUrl(next, getMainCover(next), SMALL_COVER_THUMB),
      ]);

      return next;
    },
    onSettled: () => setProgress(null),
    onSuccess: refreshSongs,
    onError: (error) => {
      if (error instanceof FileProblem) {
        toast.error(error.message);

        return;
      }

      toast.error('Обложка не загрузилась: проверьте соединение');
    },
  });

  const pickCover = (file: File): void => {
    upload.mutate(file);
  };
  const onReleaseDateChange = (targetRelease: string): void => {
    save.mutate({ target_release: targetRelease });
  };
  const onCoverUploadClick = (): void => {
    if (coverInputRef.current) {
      coverInputRef.current.click();
    }
  };
  const onCoverInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const pickedFile = event.target.files?.[0];

    if (pickedFile) {
      pickCover(pickedFile);
    }

    event.target.value = '';
  };
  const onBandlinkSave = (bandlink: string): void => {
    save.mutate({ bandlink });
  };
  const onSendClick = (): void => {
    save.mutate({ status: SongStatus.sent });
  };
  const onCancelSendClick = (): void => {
    save.mutate({ status: SongStatus.done });
  };

  let releaseDateLabel = 'Не выбрана';

  if (song.target_release) {
    releaseDateLabel = getDateLabel(song.target_release);
  }

  const releaseCover = song.release_cover || undefined;
  const hasMissing = missing.length > 0;
  let sendNote = 'Всё готово к отправке';

  if (hasMissing) {
    sendNote = `Для отправки на лейбл нужны: ${missing.join(', ')}`;
  }

  let releasePlanNote = 'Укажите дату релиза: в этот день песня будет выпущена';
  let releasedDateSuffix = '';

  if (song.target_release) {
    releasePlanNote = `Будет выпущена ${getDateLabel(song.target_release)}`;
    releasedDateSuffix = ` ${getDateLabel(song.target_release)}`;
  }

  let coverProgressPercent = 0;

  if (progress !== null) {
    coverProgressPercent = Math.round(progress * PERCENT);
  }

  const coverActionLabel = song.release_cover ? 'Заменить' : 'Загрузить';
  const coverMissingNote = song.release_cover ? '' : ', не загружена';
  const isSendDisabled = hasMissing || save.isPending;

  return {
    coverInputRef,
    isSent,
    isOnLabel,
    isReleased,
    targetRelease: song.target_release ?? '',
    releaseDateLabel,
    releaseCover,
    coverTitle: `${song.title}: обложка для релиза`,
    coverMissingNote,
    coverDownloadUrl: fileUrl(song, song.release_cover, undefined, true),
    coverActionLabel,
    canUploadCover: !isSent && isEditable,
    isCoverUploadPending: upload.isPending,
    isCoverUploading: progress !== null,
    coverProgressPercent,
    hasLyrics: Boolean((song.lyrics ?? '').trim()),
    bandlinkHref,
    bandlinkValue: song.bandlink ?? '',
    showBandlinkLink: isSent && !isEditable && Boolean(bandlinkHref),
    canEditBandlink: isSent && isEditable,
    showNotSentNote: !isSent && !isEditable,
    canSend: !isSent && isEditable,
    sendNote,
    hasMissing,
    isSendDisabled,
    isSavePending: save.isPending,
    releasePlanNote,
    releasedDateSuffix,
    onCoverPick: isEditable ? pickCover : undefined,
    onReleaseDateChange,
    onCoverUploadClick,
    onCoverInputChange,
    onBandlinkSave,
    onSendClick,
    onCancelSendClick,
  };
}

/**
 * Релиз песни: дата, обложка для релиза (JPEG 3000x3000), финальный WAV (по желанию), текст,
 * отметка об отправке на лейбл, после отправки - ссылка bandlink
 *
 * "Выпущена" ставится сама в день релиза. Без editable - только смотреть и скачать обложку
 */
export function ReleaseSection({
  projectId,
  song,
  isEditable,
}: ReleaseSectionProps): ReactNode {
  const {
    coverInputRef,
    isSent,
    isOnLabel,
    isReleased,
    targetRelease,
    releaseDateLabel,
    releaseCover,
    coverTitle,
    coverMissingNote,
    coverDownloadUrl,
    coverActionLabel,
    canUploadCover,
    isCoverUploadPending,
    isCoverUploading,
    coverProgressPercent,
    hasLyrics,
    bandlinkHref,
    bandlinkValue,
    showBandlinkLink,
    canEditBandlink,
    showNotSentNote,
    canSend,
    sendNote,
    hasMissing,
    isSendDisabled,
    isSavePending,
    releasePlanNote,
    releasedDateSuffix,
    onCoverPick,
    onReleaseDateChange,
    onCoverUploadClick,
    onCoverInputChange,
    onBandlinkSave,
    onSendClick,
    onCancelSendClick,
  } = useReleaseSection({ song, isEditable });

  const badgeClassName = cn('text-sm', {
    'text-led-green': isReleased,
    'text-led-amber': !isReleased,
  });
  const badgeText = isReleased ? 'Выпущена' : 'Отправлена на лейбл';
  let releaseBadge: ReactNode = null;

  if (isSent) {
    releaseBadge = <span className={badgeClassName}>{badgeText}</span>;
  }

  const coverPlaceholder = <ImagePlus className="size-5" />;
  const lyricsParams = { projectId, songId: song.id };
  const sendButtonVariant = hasMissing ? 'secondary' : 'default';

  return (
    <Section title="Релиз" action={releaseBadge}>
      <div className={GROUP_ROWS}>
        <PropRow label="Дата релиза">
          {isEditable ? (
            <DateField
              isQuiet
              id="song-release"
              value={targetRelease}
              placeholder="Не выбрана"
              // у отправленной песни дату переносят, но не убирают (так же проверяет сервер)
              isClearable={!isSent}
              onChange={onReleaseDateChange}
            />
          ) : (
            <span className="px-2 text-dim">{releaseDateLabel}</span>
          )}
        </PropRow>

        <div className="flex items-center gap-3 px-4 py-3">
          <ImageSlot
            record={song}
            file={releaseCover}
            thumb={SMALL_COVER_THUMB}
            title={coverTitle}
            onPick={onCoverPick}
            accept={RELEASE_COVER_ACCEPT}
            placeholder={coverPlaceholder}
            className="size-12 rounded-lg"
          />
          <div className="min-w-0 flex-1">
            <p>Обложка для релиза</p>
            <p className="text-sm text-dim">
              JPEG {RELEASE_COVER_SIZE}x{RELEASE_COVER_SIZE}
              {coverMissingNote}
            </p>
          </div>
          {song.release_cover && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Скачать оригинал"
              className="text-dim"
              asChild
            >
              <a href={coverDownloadUrl} download>
                <Download />
              </a>
            </Button>
          )}
          {canUploadCover && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-dim"
              disabled={isCoverUploadPending}
              onClick={onCoverUploadClick}
            >
              {coverActionLabel}
            </Button>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept={RELEASE_COVER_ACCEPT}
            hidden
            onChange={onCoverInputChange}
          />
        </div>
        {isCoverUploading && (
          <div className="px-4 py-2">
            <Progress
              value={coverProgressPercent}
              aria-label="Загрузка обложки"
            />
          </div>
        )}

        <ReleaseAudio song={song} isEditable={isEditable} isSent={isSent} />

        <Link
          to="/p/$projectId/songs/$songId/lyrics"
          params={lyricsParams}
          className="flex min-h-12 items-center gap-3 px-4 transition-colors hover:bg-groove/40 md:min-h-11"
        >
          <span className="w-28 shrink-0 text-dim">Текст песни</span>
          <span className="flex flex-1 items-center justify-end gap-1.5">
            {hasLyrics ? (
              <>
                <Check className="size-4 text-led-green" />
                Есть
              </>
            ) : (
              <span className="text-dim">Нет</span>
            )}
          </span>
          <ChevronRight className="size-4 shrink-0 text-dim/60" />
        </Link>

        {showBandlinkLink && (
          <PropRow label="Bandlink">
            <a
              href={bandlinkHref}
              target="_blank"
              rel="noreferrer"
              className="truncate px-2 text-ink underline-offset-4 hover:underline"
            >
              {song.bandlink}
            </a>
          </PropRow>
        )}
        {canEditBandlink && (
          <PropRow label="Bandlink">
            <AutosaveInput
              id="song-bandlink"
              placeholder="https://band.link/..."
              value={bandlinkValue}
              validate={checkIsBandlinkValid}
              onSave={onBandlinkSave}
            />
          </PropRow>
        )}

        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
          {showNotSentNote && (
            <p className="flex-1 text-sm text-dim">
              Ещё не отправлена на лейбл
            </p>
          )}
          {canSend && (
            <>
              <p className="flex-1 text-sm text-dim">{sendNote}</p>
              <Button
                variant={sendButtonVariant}
                disabled={isSendDisabled}
                onClick={onSendClick}
              >
                <Send data-icon="inline-start" />
                Отправлена на лейбл
              </Button>
            </>
          )}
          {isOnLabel && (
            <>
              <p className="flex-1 text-sm text-dim">{releasePlanNote}</p>
              {isEditable && (
                <Button
                  variant="ghost"
                  className="text-dim"
                  disabled={isSavePending}
                  onClick={onCancelSendClick}
                >
                  Отменить отправку
                </Button>
              )}
            </>
          )}
          {isReleased && (
            <p className="flex-1 text-sm text-dim">
              Выпущена{releasedDateSuffix}
            </p>
          )}
        </div>
      </div>
    </Section>
  );
}

/** Загрузка, замена и удаление финальной версии трека */
function useReleaseAudio({
  song,
  isEditable,
  isSent,
}: ReleaseAudioProps): UseReleaseAudioResult {
  const client = useQueryClient();
  const fileUrl = useFileUrl();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const project = useQuery(projectQuery(song.project));
  const file = song.release_audio || undefined;
  const refreshSongs = (): Promise<void> =>
    client.invalidateQueries({ queryKey: queryKeys.songs.all });

  const upload = useMutation({
    mutationFn: (audioFile: File) => {
      if (!checkIsReleaseAudio(audioFile)) {
        throw new FileProblem('Нужен файл WAV или MP3');
      }

      if (audioFile.size > MAX_RELEASE_AUDIO_BYTES) {
        throw new FileProblem(
          `Файл больше ${getFileSizeLabel(MAX_RELEASE_AUDIO_BYTES)} не загрузится`
        );
      }

      const form = new FormData();
      form.set(RELEASE_AUDIO_FIELD, audioFile);
      form.set(
        RELEASE_AUDIO_NAME_FIELD,
        audioFile.name.slice(0, RELEASE_AUDIO_NAME_MAX)
      );
      setProgress(0);

      return sendRecordForm<Song>(Collections.Songs, form, {
        id: song.id,
        onProgress: setProgress,
      });
    },
    onSettled: () => setProgress(null),
    onSuccess: refreshSongs,
    onError: (error) => {
      if (error instanceof FileProblem) {
        toast.error(error.message);

        return;
      }

      toast.error('Трек не загрузился: проверьте соединение');
    },
  });
  const remove = useMutation({
    mutationFn: () =>
      getCollection(pb, Collections.Songs).update(
        song.id,
        CLEARED_RELEASE_AUDIO
      ),
    onSuccess: async () => {
      setIsRemoving(false);
      await refreshSongs();
    },
    onError: () => toast.error(SAVE_FAILED),
  });

  const onAudioUploadClick = (): void => {
    if (audioInputRef.current) {
      audioInputRef.current.click();
    }
  };
  const onAudioInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const pickedFile = event.target.files?.[0];

    if (pickedFile) {
      upload.mutate(pickedFile);
    }

    event.target.value = '';
  };
  const onRemoveClick = (): void => {
    setIsRemoving(true);
  };
  const onRemoveConfirm = (): void => {
    remove.mutate();
  };

  let name = song.release_audio_name || '';

  if (!name) {
    // без сохранённого имени - имя файла на сервере без приписки PocketBase
    if (file) {
      name = getDisplayFileName(file);
    }
  }

  let progressPercent = 0;

  if (progress !== null) {
    progressPercent = Math.round(progress * PERCENT);
  }

  const isUploading = progress !== null;
  // загруженный трек - плеер; пока идёт загрузка, вместо плеера полоска хода
  let playerFile: string | undefined;

  if (!isUploading) {
    playerFile = file;
  }

  const canRemove = isEditable && !isSent;
  // обложка для системы: обложка для релиза, а без неё - основная
  let artwork = fileUrl(song, getMainCover(song), COVER_THUMB);

  if (song.release_cover) {
    artwork = fileUrl(song, song.release_cover, COVER_THUMB);
  }

  const audioMeta: AudioMeta = {
    artist: project.data?.name,
    album: song.title,
    artwork,
  };

  return {
    audioInputRef,
    file,
    name,
    isHidden: !file && !isEditable,
    isUploadPending: upload.isPending,
    isUploading,
    progressPercent,
    playerFile,
    audioMeta,
    isRemoving,
    setIsRemoving,
    isRemovePending: remove.isPending,
    onReplace: isEditable ? onAudioUploadClick : undefined,
    onRemove: canRemove ? onRemoveClick : undefined,
    onAudioUploadClick,
    onAudioInputChange,
    onRemoveConfirm,
  };
}

/**
 * Финальная версия трека: послушать прямо в блоке релиза, скачать с исходным именем
 *
 * Загрузить и заменить можно в любой момент, и у выпущенной песни тоже; убрать - только пока
 * песня не отправлена на лейбл (так же проверяет сервер, pb_hooks/lib/release.js)
 */
function ReleaseAudio({
  song,
  isEditable,
  isSent,
}: ReleaseAudioProps): ReactNode {
  const {
    audioInputRef,
    file,
    name,
    isHidden,
    isUploadPending,
    isUploading,
    progressPercent,
    playerFile,
    audioMeta,
    isRemoving,
    setIsRemoving,
    isRemovePending,
    onReplace,
    onRemove,
    onAudioUploadClick,
    onAudioInputChange,
    onRemoveConfirm,
  } = useReleaseAudio({ song, isEditable, isSent });

  if (isHidden) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      {/* загруженный трек - сразу плеер, без строки-заголовка; пустой - строка с загрузкой */}
      {!file && (
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-groove text-dim">
            <AudioLines className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p>Финальная версия</p>
            <p className="truncate text-sm text-dim">
              WAV или MP3, не загружена
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-dim"
            aria-label="Загрузить финальную версию"
            disabled={isUploadPending}
            onClick={onAudioUploadClick}
          >
            Загрузить
          </Button>
        </div>
      )}
      <input
        ref={audioInputRef}
        type="file"
        accept={RELEASE_AUDIO_ACCEPT}
        hidden
        onChange={onAudioInputChange}
      />
      {isUploading && (
        <Progress value={progressPercent} aria-label="Загрузка трека" />
      )}
      {playerFile && (
        <AudioPlayer
          record={song}
          file={playerFile}
          name={name}
          caption="Финальная версия"
          onReplace={onReplace}
          onRemove={onRemove}
          meta={audioMeta}
        />
      )}
      <ConfirmDialog
        open={isRemoving}
        onOpenChange={setIsRemoving}
        title="Убрать финальную версию?"
        confirmLabel="Убрать"
        isBusy={isRemovePending}
        onConfirm={onRemoveConfirm}
      />
    </div>
  );
}
