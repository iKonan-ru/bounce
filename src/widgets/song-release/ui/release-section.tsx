import { ImagePlus, Download, Check, ChevronRight, Send } from 'lucide-react';
import type { ReactNode } from 'react';
import { RELEASE_COVER_SIZE } from '@/entities/song';
import { GROUP_ROWS, RELEASE_COVER_ACCEPT } from '@/shared/constants';
import {
  Section,
  PropRow,
  DateField,
  ImageSlot,
  Button,
  Progress,
  AutosaveInput,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { Link } from '@tanstack/react-router';
import { BANDLINK_RE, SMALL_COVER_THUMB } from '../constants/release-section';
import { useReleaseSection } from '../hooks/use-release-section';
import type { ReleaseSectionProps } from '../types/release-section';
import { ReleaseAudio } from './release-audio';

/** Bandlink можно оставить пустым или указать адрес http(s) */
function checkIsBandlinkValid(value: string): boolean {
  if (value === '') {
    return true;
  }

  return BANDLINK_RE.test(value);
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
