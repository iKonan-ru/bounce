import { Film, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { VIDEO_STATUS_OPTIONS } from '@/entities/video';
import { useFileUrl } from '@/shared/hooks';
import { Link } from '@tanstack/react-router';
import type { VideoRowProps } from '../types/videos';

/** Название, превью и статус без полей музыкального выпуска */
export function VideoRow({
  video,
  handle,
  projectId,
}: VideoRowProps): ReactNode {
  const fileUrl = useFileUrl();
  const preview = fileUrl(video, video.preview, '96x96');
  const status = VIDEO_STATUS_OPTIONS.find(
    (item) => item.value === video.status
  )?.label;
  const params = { projectId, videoId: video.id };

  return (
    <div className="group/row flex items-center px-2 hover:bg-groove/30">
      {handle}
      <Link
        to="/p/$projectId/videos/$videoId"
        params={params}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-2 py-3"
      >
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-console">
          {preview ? (
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <Film className="size-5 text-dim" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate">{video.title}</span>
          <span className="text-xs text-dim">{status}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-dim" />
      </Link>
    </div>
  );
}
