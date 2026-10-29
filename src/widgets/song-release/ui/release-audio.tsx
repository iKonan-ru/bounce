import { AudioLines } from 'lucide-react';
import type { ReactNode } from 'react';
import { AudioPlayer } from '@/features/player';
import { RELEASE_AUDIO_ACCEPT } from '@/shared/constants';
import { Button, Progress, ConfirmDialog } from '@/shared/ui';
import { useReleaseAudio } from '../hooks/use-release-audio';
import type { ReleaseAudioProps } from '../types/release-section';

/**
 * Финальная версия трека: послушать прямо в блоке релиза, скачать с исходным именем
 *
 * Загрузить и заменить можно в любой момент, и у выпущенной песни тоже; убрать - только пока
 * песня не отправлена на лейбл (так же проверяет сервер, pb_hooks/lib/release.js)
 */
export function ReleaseAudio({
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
