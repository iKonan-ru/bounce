import type { ReactNode } from 'react';
import { videosQuery } from '@/entities/video';
import { GROUP_ROWS } from '@/shared/constants';
import { Section } from '@/shared/ui';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { RelatedVideosProps } from '../types/song';

/** Одна песня может сопровождаться несколькими роликами */
export function RelatedVideos({
  projectId,
  songId,
}: RelatedVideosProps): ReactNode {
  const query = useQuery(videosQuery(projectId));
  const videos = (query.data ?? []).filter((video) => video.song === songId);

  if (videos.length === 0) {
    return null;
  }

  return (
    <Section title="Видео">
      <div className={GROUP_ROWS}>
        {videos.map((video) => {
          const params = { projectId, videoId: video.id };

          return (
            <Link
              key={video.id}
              to="/p/$projectId/videos/$videoId"
              params={params}
              className="block px-4 py-3 hover:bg-groove/30"
            >
              {video.title}
            </Link>
          );
        })}
      </div>
    </Section>
  );
}
