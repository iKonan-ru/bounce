import { Plus, ListPlus } from 'lucide-react';
import type { ReactNode } from 'react';
import { ProjectDirection } from '@/entities/project';
import type { VideoPost } from '@/entities/video-post';
import { AddProjectLink } from '@/features/project-links';
import { GROUP_ROWS } from '@/shared/constants';
import {
  Section,
  Button,
  MenuSelect,
  PropRow,
  BucketedSections,
  Loading,
} from '@/shared/ui';
import { useVideoPublications } from '../hooks/use-video-publications';
import type { VideoPublicationsProps } from '../types/publishing';
import { PublicationDialog } from './publication-dialog';
import { VideoPostRow } from './video-post-row';

/** Публикации карточки и проекта; опубликованные в общем плане свернуты */
export function VideoPublications(props: VideoPublicationsProps): ReactNode {
  const state = useVideoPublications(props);
  const { video, projectId } = props;
  const renderPost = (post: VideoPost): ReactNode => (
    <VideoPostRow
      post={post}
      accountName={state.accountName(post)}
      videoTitle={video ? undefined : state.videoTitle(post)}
      onOpen={state.onOpen}
    />
  );
  const action = video && state.canWork && (
    <Button
      variant="ghost"
      size="sm"
      disabled={state.isBusy || !state.canCreate}
      onClick={state.onPromo}
    >
      <ListPlus className="size-4" />
      Из промо-плана
    </Button>
  );

  return (
    <Section title={video ? 'Публикации' : 'Видео'} action={action}>
      <div className="flex flex-col gap-4">
        {state.isPending && <Loading className="h-20 rounded-xl" />}
        {state.isError && (
          <p className="text-sm text-led-red">Публикации не загрузились.</p>
        )}
        {video && state.list.length > 0 && (
          <div className={GROUP_ROWS}>
            <PropRow label="Основная">
              <MenuSelect
                className="max-w-full"
                label="Основная публикация"
                value={video.main_publication}
                options={state.mainOptions}
                onChange={state.onMainChange}
                disabled={!state.canEdit || state.isBusy}
              />
            </PropRow>
            <ul>
              {state.list.map((post) => (
                <li key={post.id}>{renderPost(post)}</li>
              ))}
            </ul>
          </div>
        )}
        {!video && (
          <BucketedSections
            groups={state.groups}
            noneLabel="Без даты"
            done={state.published}
            doneLabel="Опубликовано"
            renderItem={renderPost}
            renderDone={renderPost}
          />
        )}
        {state.canCreate && (
          <Button
            variant="ghost"
            className="justify-start self-start"
            onClick={state.onCreate}
          >
            <Plus className="size-4" />
            Добавить публикацию
          </Button>
        )}
        {!state.canCreate && state.isOwner && (
          <div className={GROUP_ROWS}>
            <AddProjectLink
              projectId={projectId}
              direction={ProjectDirection.video}
            />
          </div>
        )}
        {!state.isPending &&
          !state.canCreate &&
          state.list.length === 0 &&
          !state.isOwner && (
            <p className="text-sm text-dim">Публикаций пока нет</p>
          )}
      </div>
      {(state.openId === 'new' || state.openedPost) && (
        <PublicationDialog
          projectId={projectId}
          videoId={video?.id}
          post={state.openedPost}
          canWork={state.canWork}
          onClose={state.onClose}
        />
      )}
    </Section>
  );
}
