import { useState } from 'react';
import { postsQuery } from '@/entities/post';
import {
  projectsQuery,
  getProjectRole,
  ProjectDirection,
} from '@/entities/project';
import { songsQuery } from '@/entities/song';
import { tasksQuery } from '@/entities/task';
import { videosQuery } from '@/entities/video';
import { videoPostsQuery } from '@/entities/video-post';
import { BUCKETS } from '@/shared/constants';
import { useMe, useIsOnline } from '@/shared/hooks';
import { ContentDirection } from '@/shared/types';
import { getBucket, sortByDueDay } from '@/shared/utils';
import { useQueries, useQuery } from '@tanstack/react-query';
import { MyPlanView } from '../types/my-plan';
import type { MyProjectData } from '../types/my-plan';
import { getMyPlanEntries } from '../utils/entries';

/** Те же запросы и кэш, что внутри проектов; ошибка одного не скрывает остальные */
export function useMyPlan() {
  const me = useMe();
  const isOnline = useIsOnline();
  const projectQuery = useQuery(projectsQuery);
  const projects = (projectQuery.data ?? []).filter((project) =>
    getProjectRole(project, me?.id)
  );
  const songs = useQueries({
    queries: projects.map((project) => ({
      ...songsQuery(project.id),
      enabled: project.directions.includes(ProjectDirection.music),
    })),
  });
  const videos = useQueries({
    queries: projects.map((project) => ({
      ...videosQuery(project.id),
      enabled: project.directions.includes(ProjectDirection.video),
    })),
  });
  const tasks = useQueries({
    queries: projects.map((project) => tasksQuery(project.id)),
  });
  const posts = useQueries({
    queries: projects.map((project) => ({
      ...postsQuery(project.id),
      enabled:
        project.music_release_enabled &&
        project.directions.includes(ProjectDirection.music),
    })),
  });
  const videoPosts = useQueries({
    queries: projects.map((project) => ({
      ...videoPostsQuery(project.id),
      enabled: project.directions.includes(ProjectDirection.video),
    })),
  });
  const data: MyProjectData[] = projects.map((project, index) => {
    const hasMusic = project.directions.includes(ProjectDirection.music);
    const hasVideo = project.directions.includes(ProjectDirection.video);
    const required = [
      tasks[index],
      ...(hasMusic ? [songs[index]] : []),
      ...(hasMusic && project.music_release_enabled ? [posts[index]] : []),
      ...(hasVideo ? [videos[index], videoPosts[index]] : []),
    ];

    return {
      project,
      songs: songs[index]?.data ?? [],
      videos: videos[index]?.data ?? [],
      tasks: tasks[index]?.data ?? [],
      posts: posts[index]?.data ?? [],
      videoPosts: videoPosts[index]?.data ?? [],
      isIncomplete: required.some((query) => !query?.data),
      isError: required.some((query) => query?.isError),
      isFetching: required.some((query) => query?.isFetching),
    };
  });
  const [view, setView] = useState(MyPlanView.Tasks);
  const [selectedProject, setProject] = useState('');
  const [direction, setDirection] = useState(ContentDirection.All);
  const [openedId, setOpenedId] = useState<string>();
  const projectId = projects.some((project) => project.id === selectedProject)
    ? selectedProject
    : '';
  const entries = data.flatMap((item) =>
    getMyPlanEntries(item, me?.id ?? '', direction)
  );
  const filtered = entries.filter(
    (entry) =>
      (!projectId || entry.project.id === projectId) &&
      (view === MyPlanView.Tasks) === (entry.kind === 'work')
  );
  const groups = BUCKETS.map((bucket) => ({
    bucket,
    items: sortByDueDay(
      filtered.filter(
        (entry) => !entry.isDone && getBucket(entry.due, new Date()) === bucket
      )
    ),
  })).filter((group) => group.items.length > 0);
  const done = filtered
    .filter((entry) => entry.isDone)
    .toSorted((a, b) => b.due.localeCompare(a.due));
  const visibleData = data.filter(
    (item) => !projectId || item.project.id === projectId
  );
  const isLoading =
    isOnline &&
    (projectQuery.isPending ||
      visibleData.some((item) => item.isIncomplete && item.isFetching));
  const isError =
    projectQuery.isError || visibleData.some((item) => item.isError);
  const isIncomplete =
    !projectQuery.data || visibleData.some((item) => item.isIncomplete);
  const opened = entries.find((entry) => entry.id === openedId);
  const onClose = (): void => setOpenedId(undefined);
  const onOpen = (id: string): void => setOpenedId(id);
  const count = (project: string, kind: 'work' | 'content'): number =>
    entries.filter(
      (entry) =>
        entry.project.id === project &&
        !entry.isDone &&
        (kind === 'work') === (entry.kind === 'work')
    ).length;
  const renderData = visibleData.filter(
    (item) =>
      direction === ContentDirection.All ||
      direction === ContentDirection.General ||
      item.project.directions.some((value) => value === direction)
  );

  return {
    view,
    setView,
    projectId,
    setProject,
    direction,
    setDirection,
    groups,
    done,
    opened,
    onClose,
    onOpen,
    isOnline,
    isLoading,
    isError,
    isIncomplete,
    renderData,
    count,
    projectOptions: [
      { value: '', label: 'Все проекты' },
      ...projects.map((project) => ({
        value: project.id,
        label: project.name,
      })),
    ],
  };
}
