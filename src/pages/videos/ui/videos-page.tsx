import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { ProjectDirection, MaterialDirections } from '@/entities/project';
import { getProjectLinks } from '@/entities/service';
import type { Video } from '@/entities/video';
import { NewVideoDialog } from '@/features/create-video';
import { ProjectHeader } from '@/features/project-header';
import { ProjectLinksBar } from '@/features/project-links';
import { GROUP_ROWS } from '@/shared/constants';
import { Button, Loading, SortableList, EmptyState } from '@/shared/ui';
import { useVideosPage } from '../hooks/use-videos-page';
import { VideoRow } from './video-row';

/** Видео проекта */
export function VideosPage(): ReactNode {
  const {
    project,
    projectId,
    videos,
    canEdit,
    isPending,
    isError,
    isEnabled,
    isCreating,
    onCreate,
    onClose,
    onReorder,
  } = useVideosPage();
  const renderRow = (video: Video, handle: ReactNode): ReactNode => (
    <VideoRow video={video} handle={handle} projectId={projectId} />
  );

  const hasLinks =
    project && getProjectLinks(project, ProjectDirection.video).length > 0;

  return (
    <>
      <ProjectHeader projectId={projectId} project={project} />
      {project && (
        <div className="mb-6 flex items-center justify-between gap-2">
          <MaterialDirections
            project={project}
            current={ProjectDirection.video}
          />
          {canEdit && isEnabled && (
            <Button
              className="max-sm:px-2.5"
              onClick={onCreate}
              disabled={isPending || isError}
            >
              <Plus data-icon="inline-start" />
              Новое видео
            </Button>
          )}
        </div>
      )}
      {isPending && <Loading className="h-40 rounded-xl" />}
      {!isPending && isEnabled && videos.length > 0 && (
        <div className={GROUP_ROWS}>
          <SortableList
            items={videos}
            onReorder={onReorder}
            disabled={!canEdit}
          >
            {renderRow}
          </SortableList>
        </div>
      )}
      {!isPending && !isError && isEnabled && videos.length === 0 && (
        <EmptyState>Видео пока нет</EmptyState>
      )}
      {isCreating && canEdit && isEnabled && (
        <NewVideoDialog projectId={projectId} onClose={onClose} />
      )}
      {!isPending && !isEnabled && (
        <p className="text-dim">Направление видео не включено.</p>
      )}
      {project && hasLinks && (
        <ProjectLinksBar
          project={project}
          direction={ProjectDirection.video}
          className="mt-auto pt-10"
        />
      )}
      {isError && <p className="text-led-red">Видео не загрузились.</p>}
    </>
  );
}
