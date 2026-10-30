import { Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { InlineTitle } from '@/features/mentions';
import { PageHeader, Loading, Button, ConfirmDialog } from '@/shared/ui';
import { Navigate } from '@tanstack/react-router';
import { useDeleteSong } from '../hooks/use-delete-song';
import { useSongEditPage } from '../hooks/use-song-edit-page';
import type { SongTitleProps, DeleteSongProps } from '../types/song-edit';
import { Covers } from './covers';
import { SongForm } from './song-form';

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
        className="text-led-red hover:bg-led-red/10 hover:text-led-red"
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
