import type { ReactNode } from 'react';
import { ProjectDirection, MaterialDirections } from '@/entities/project';
import type { Video } from '@/entities/video';
import { AddRow } from '@/features/mentions';
import { ProjectLinksBar } from '@/features/project-links';
import { GROUP_ROWS } from '@/shared/constants';
import { PageHeader, Loading, SortableList } from '@/shared/ui';
import { useVideosPage } from '../hooks/use-videos-page';
import { VideoRow } from './video-row';

/** Видео проекта */
export function VideosPage(): ReactNode {
  const {
    project,
    projectId,
    videos,
    crumbs,
    canEdit,
    isPending,
    isError,
    isEnabled,
    isAdding,
    onAdd,
    onReorder,
  } = useVideosPage();
  const renderRow = (video: Video, handle: ReactNode): ReactNode => (
    <VideoRow video={video} handle={handle} projectId={projectId} />
  );

  return (
    <>
      <PageHeader title={project?.name ?? ''} crumbs={crumbs} />
      {project && (
        <div className="mb-6">
          <MaterialDirections
            project={project}
            current={ProjectDirection.video}
          />
        </div>
      )}
      {isPending && <Loading className="h-40 rounded-xl" />}
      {!isPending && isEnabled && (
        <div className={GROUP_ROWS}>
          <SortableList
            items={videos}
            onReorder={onReorder}
            disabled={!canEdit}
          >
            {renderRow}
          </SortableList>
          {canEdit && (
            <AddRow
              id="new-video"
              label="Добавить видео"
              onAdd={onAdd}
              isBusy={isAdding}
            />
          )}
          {!canEdit && videos.length === 0 && (
            <p className="px-4 py-3 text-dim">Видео пока нет</p>
          )}
        </div>
      )}
      {!isPending && !isEnabled && (
        <p className="text-dim">Направление видео не включено.</p>
      )}
      {project && (
        <ProjectLinksBar
          project={project}
          direction={ProjectDirection.video}
          className="mt-8"
        />
      )}
      {isError && <p className="text-led-red">Видео не загрузились.</p>}
    </>
  );
}
