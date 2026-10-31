import { Film, ListPlus, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { Meter, MeterSize, getSongProgress } from '@/entities/song';
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
  SectionButton,
  SortableList,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/ui';
import { getSafeUrl } from '@/shared/utils';
import { NotesFeed } from '@/widgets/notes';
import { VideoPublications } from '@/widgets/posts';
import { Link, useParams } from '@tanstack/react-router';
import { useVideoPage } from '../hooks/use-video-page';
import type { TemplateChoiceProps } from '../types/video';
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
  const { projectId: routeProjectId, videoId: routeVideoId } = useParams({
    from: '/app/p/$projectId/videos/$videoId',
  });
  const state = useVideoPage(routeProjectId, routeVideoId);
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
      pending={state.cover.pending}
      placeholder={previewPlaceholder}
      className="size-20 rounded-xl md:size-28"
    />
  );
  const headerEdit = canEdit
    ? {
        link: {
          to: '/p/$projectId/videos/$videoId/edit' as const,
          params: { projectId, videoId },
        },
        label: 'Настройки видео',
      }
    : undefined;
  const facts = [
    VIDEO_STATUS_OPTIONS.find((option) => option.value === video.status)?.label,
    video.aspect,
  ]
    .filter(Boolean)
    .join(' · ');
  const progress = getSongProgress(stages);
  const linkedSong = video.song && (
    <Button
      variant="secondary"
      size="sm"
      className="h-9 px-3 max-sm:flex-1"
      asChild
    >
      <Link
        to="/p/$projectId/songs/$songId"
        params={{ projectId, songId: video.song }}
      >
        {state.linkedSongTitle}
      </Link>
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
        <SectionButton icon={<ListPlus />} disabled={state.isApplying}>
          Добавить этапы из шаблона
        </SectionButton>
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
      {video.description && <Markup text={video.description} />}
      <Section
        title="Этапы"
        action={
          stages.length > 0 ? (
            <span className="text-sm text-dim tabular-nums">
              {progress.done} из {progress.total}
            </span>
          ) : (
            template
          )
        }
      >
        <div className={GROUP_ROWS}>
          {stages.length > 0 && (
            <div className="px-4 py-3.5">
              <Meter stages={stages} size={MeterSize.Large} />
            </div>
          )}
          <SortableList
            className="divide-y divide-border/70 dark:divide-border/50"
            handleClassName="mr-1 h-12 w-6 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 focus-visible:opacity-100"
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
            <p className="px-4 py-3 text-sm text-dim">Этапов нет</p>
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
        edit={headerEdit}
        meta={facts}
        below={linkedSong}
      />
      <Columns main={main} side={side} />
    </>
  );
}
