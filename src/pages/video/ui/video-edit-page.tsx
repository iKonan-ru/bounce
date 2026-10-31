import { Film, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { InlineTitle } from '@/features/mentions';
import {
  PageHeader,
  Loading,
  Button,
  ConfirmDialog,
  Section,
  ImageSlot,
} from '@/shared/ui';
import { Navigate, useParams } from '@tanstack/react-router';
import { useVideoPage } from '../hooks/use-video-page';
import { VideoEditor } from './video-editor';

/** Настройки видео: название, свойства, обложка и удаление */
export function VideoEditPage(): ReactNode {
  const { projectId, videoId } = useParams({
    from: '/app/p/$projectId/videos/$videoId/edit',
  });
  const state = useVideoPage(projectId, videoId);
  const params = { projectId, videoId };
  const onTitleSave = (title: string): void => {
    void state.onSave({ title }).catch(() => undefined);
  };

  if (state.shouldRedirect) {
    return <Navigate to="/p/$projectId/videos/$videoId" params={params} />;
  }

  if (state.isPending) {
    return <Loading className="h-60 rounded-xl" />;
  }

  const { video } = state;

  if (!video) {
    return <p className="text-led-red">Видео не найдено или нет соединения.</p>;
  }

  const crumbs = [
    ...state.crumbs,
    {
      label: video.title,
      link: { to: '/p/$projectId/videos/$videoId' as const, params },
    },
  ];
  const title = (
    <InlineTitle
      value={video.title}
      label="Переименовать видео"
      maxLength={200}
      onSave={onTitleSave}
    />
  );
  const deleteTitle = `Удалить видео "${video.title}"?`;

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        title={state.canEdit ? title : video.title}
        meta="Настройки видео"
      />
      <div className="grid max-w-5xl grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-2 lg:gap-12">
        {state.canEdit && (
          <VideoEditor
            key={video.id}
            video={video}
            isSaving={state.isSaving}
            onSave={state.onSave}
          />
        )}
        <Section title="Обложка">
          <ImageSlot
            record={video}
            file={video.preview || undefined}
            thumb="600x600"
            title={video.title}
            onPick={state.canEdit ? state.cover.pick : undefined}
            canReplace={state.canEdit}
            onRemove={state.canEdit ? state.onRemovePreview : undefined}
            pending={state.cover.pending}
            placeholder={<Film className="size-10" strokeWidth={1.5} />}
            className="size-20 rounded-xl md:size-28"
          />
        </Section>
        {state.canEdit && (
          <div className="lg:col-span-2">
            <Button
              variant="ghost"
              className="text-led-red hover:bg-led-red/10 hover:text-led-red"
              onClick={state.onDelete}
            >
              <Trash2 data-icon="inline-start" />
              Удалить видео
            </Button>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={state.isConfirming}
        onOpenChange={state.setIsConfirming}
        title={deleteTitle}
        description="Этапы и заметки видео удалятся вместе с ним. Связанная песня останется."
        confirmLabel="Удалить"
        isBusy={state.isRemoving}
        onConfirm={state.onDeleteConfirm}
      />
    </>
  );
}
