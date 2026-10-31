import { Film, Pencil, Trash2, ListPlus, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { Meter, MeterSize } from '@/entities/song';
import { VIDEO_STATUS_OPTIONS, VIDEO_TEMPLATE_OPTIONS } from '@/entities/video';
import type { VideoStage } from '@/entities/video';
import { Markup } from '@/features/markup';
import { AddRow } from '@/features/mentions';
import { GROUP_ROWS } from '@/shared/constants';
import {
  PageHeader,
  Section,
  Columns,
  Button,
  Loading,
  ImageSlot,
  MenuSelect,
  PropRow,
  SortableList,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/ui';
import { getSafeUrl } from '@/shared/utils';
import { NotesFeed } from '@/widgets/notes';
import { VideoPublications } from '@/widgets/posts';
import { Link } from '@tanstack/react-router';
import { useVideoPage } from '../hooks/use-video-page';
import type { TemplateChoiceProps } from '../types/video';
import { VideoEditor } from './video-editor';
import { VideoStageRow } from './video-stage-row';

/** Пункт шаблона */
function TemplateChoice({
  value,
  label,
  onChoose,
}: TemplateChoiceProps): ReactNode {
  const onSelect = (): void => onChoose(value);

  return <DropdownMenuItem onSelect={onSelect}>{label}</DropdownMenuItem>;
}

/** Производство видео без музыкального релиза */
export function VideoPage(): ReactNode {
  const state = useVideoPage();
  const { video, projectId, videoId, stages, canEdit } = state;

  if (state.isPending) {
    return <Loading className="h-40 rounded-xl" />;
  }

  if (!video) {
    return <p className="text-led-red">Видео не найдено или нет соединения.</p>;
  }

  const previewPlaceholder = <Film className="size-10" strokeWidth={1.5} />;
  const media = (
    <ImageSlot
      record={video}
      file={video.preview || undefined}
      thumb="600x600"
      title={video.title}
      onPick={canEdit ? state.cover.pick : undefined}
      canReplace={canEdit}
      onRemove={canEdit ? state.onRemovePreview : undefined}
      pending={state.cover.pending}
      placeholder={previewPlaceholder}
      className="size-20 rounded-xl md:size-28"
    />
  );
  const actions = canEdit && (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Настройки видео"
      onClick={state.onEdit}
    >
      <Pencil className="size-4" />
    </Button>
  );
  const renderStage = (stage: VideoStage, handle: ReactNode): ReactNode => (
    <VideoStageRow
      stage={stage}
      canEdit={canEdit}
      people={state.people}
      handle={handle}
      projectId={projectId}
      videoId={videoId}
    />
  );
  const template = canEdit && stages.length === 0 && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={state.isApplying}>
          <ListPlus className="size-4" />
          Из шаблона
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {VIDEO_TEMPLATE_OPTIONS.map((option) => (
          <TemplateChoice
            key={option.value}
            value={option.value}
            label={option.label}
            onChoose={state.onTemplate}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const main = (
    <div className="flex flex-col gap-8">
      <div className={GROUP_ROWS}>
        <PropRow label="Статус">
          <MenuSelect
            label="Статус видео"
            value={video.status}
            options={VIDEO_STATUS_OPTIONS}
            disabled={!canEdit || state.isSaving}
            onChange={state.onStatusChange}
          />
        </PropRow>
        {video.aspect && <PropRow label="Кадр">{video.aspect}</PropRow>}
        {video.song && (
          <PropRow label="Песня">
            <Link
              to="/p/$projectId/songs/$songId"
              params={{ projectId, songId: video.song }}
              className="text-sm"
            >
              {state.linkedSongTitle}
            </Link>
          </PropRow>
        )}
      </div>
      {video.description && <Markup text={video.description} />}
      <Section title="Этапы" action={template}>
        <div className={GROUP_ROWS}>
          {stages.length > 0 && (
            <div className="px-4 py-3.5">
              <Meter stages={stages} size={MeterSize.Large} />
            </div>
          )}
          <SortableList
            items={stages}
            disabled={!canEdit}
            onReorder={state.onReorder}
          >
            {renderStage}
          </SortableList>
          {canEdit && (
            <AddRow
              id="new-video-stage"
              label="Добавить этап"
              onAdd={state.onStageAdd}
              isBusy={state.isAdding}
            />
          )}
          {!canEdit && stages.length === 0 && (
            <p className="px-4 py-3 text-dim">Этапов нет</p>
          )}
        </div>
      </Section>
      {video.script && (
        <Section title="Сценарий">
          <Markup text={video.script} />
        </Section>
      )}
      {(video.materials ?? []).length > 0 && (
        <Section title="Материалы">
          <div className={GROUP_ROWS}>
            {(video.materials ?? []).map((item, index) => (
              <a
                key={index}
                href={getSafeUrl(item.url) ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center justify-between gap-3 px-4 py-2"
              >
                <span className="min-w-0 break-words">{item.name}</span>
                <ExternalLink className="size-4 shrink-0 text-dim" />
              </a>
            ))}
          </div>
        </Section>
      )}
      <VideoPublications projectId={projectId} video={video} />
      {canEdit && (
        <div>
          <Button
            variant="ghost"
            className="text-led-red"
            onClick={state.onDelete}
          >
            <Trash2 className="size-4" />
            Удалить видео
          </Button>
        </div>
      )}
    </div>
  );
  const side = (
    <Section title="Заметки">
      <NotesFeed scope={{ project: projectId, video: videoId }} />
    </Section>
  );

  return (
    <>
      <PageHeader
        crumbs={state.crumbs}
        title={video.title}
        media={media}
        actions={actions}
      />
      <Columns main={main} side={side} />
      {state.isEditing && (
        <VideoEditor
          video={video}
          isSaving={state.isSaving}
          onSave={state.onSave}
          onClose={state.onEditClose}
        />
      )}
      <ConfirmDialog
        open={state.isConfirming}
        onOpenChange={state.setIsConfirming}
        title="Удалить видео?"
        description="Этапы и заметки видео удалятся вместе с ним. Связанная песня останется."
        confirmLabel="Удалить"
        isBusy={state.isRemoving}
        onConfirm={state.onDeleteConfirm}
      />
    </>
  );
}
