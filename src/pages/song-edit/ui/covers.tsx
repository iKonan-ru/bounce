import { ImagePlus } from 'lucide-react';
import type { ReactNode } from 'react';
import { IMAGE_ACCEPT } from '@/shared/constants';
import { Section, Progress, ConfirmDialog, ImageViewer } from '@/shared/ui';
import { useCovers } from '../hooks/use-covers';
import type { CoversProps } from '../types/song-edit';
import { CoverTile } from './cover-tile';

/** Обложки песни: плитки, добавление, просмотр и удаление */
export function Covers({ song }: CoversProps): ReactNode {
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
