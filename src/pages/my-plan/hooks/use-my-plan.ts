import { useState, useEffect } from 'react';
import { postsQuery } from '@/entities/post';
import {
  projectsQuery,
  getProjectRole,
  getAbilities,
  ProjectDirection,
} from '@/entities/project';
import { songsQuery } from '@/entities/song';
import { tasksQuery } from '@/entities/task';
import { usersQuery } from '@/entities/user';
import { videosQuery } from '@/entities/video';
import { videoPostsQuery } from '@/entities/video-post';
import { BUCKETS } from '@/shared/constants';
import { useMe, useIsOnline, useStoredChoice } from '@/shared/hooks';
import { ContentDirection } from '@/shared/types';
import { getBucket, sortByDueDay } from '@/shared/utils';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { MyPlanView, MyPlanScope } from '../types/my-plan';
import type { MyProjectData } from '../types/my-plan';
import { getMyPlanEntries } from '../utils/entries';
import {
  parseScope,
  parseView,
  parseDirection,
  parseId,
} from '../utils/preferences';

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
  const key = `bounce.plan.${me?.id ?? ''}`;
  const [view, setView] = useStoredChoice(
    `${key}.view`,
    parseView,
    MyPlanView.All
  );
  const [scope, setScope] = useStoredChoice(
    `${key}.scope`,
    parseScope,
    MyPlanScope.Mine
  );
  const [selectedProject, setProject] = useStoredChoice(
    `${key}.project`,
    parseId,
    ''
  );
  const [direction, setDirection] = useStoredChoice(
    `${key}.direction`,
    parseDirection,
    ContentDirection.All
  );
  const [selectedAssignee, setAssignee] = useStoredChoice(
    `${key}.assignee`,
    parseId,
    ''
  );
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const people = useQuery(usersQuery);
  const search = useSearch({ strict: false });
  const navigate = useNavigate();

  useEffect(() => {
    if (search.planProject) {
      setProject(search.planProject);
      setScope(MyPlanScope.All);
      setAssignee('');
      void navigate({ to: '/plan', search: {}, replace: true });
    }
  }, [search.planProject, navigate, setAssignee, setProject, setScope]);
  const [openedId, setOpenedId] = useState<string>();
  const projectId = projects.some((project) => project.id === selectedProject)
    ? selectedProject
    : '';
  const availablePeople = (people.data ?? []).filter((person) =>
    projects.some(
      (project) =>
        (!projectId || project.id === projectId) &&
        getProjectRole(project, person.id)
    )
  );
  const assignee = availablePeople.some(
    (person) => person.id === selectedAssignee
  )
    ? selectedAssignee
    : '';
  const assigneeId =
    scope === MyPlanScope.Mine ? me?.id : assignee || undefined;
  const entries = data.flatMap((item) =>
    getMyPlanEntries(item, me?.id ?? '', direction, assigneeId ?? '')
  );
  const filtered = entries.filter(
    (entry) =>
      (!projectId || entry.project.id === projectId) &&
      (view === MyPlanView.All ||
        view === MyPlanView.Projects ||
        (view === MyPlanView.Tasks) === (entry.kind === 'work'))
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

  const writableProjects = projects.filter(
    (project) => getAbilities(getProjectRole(project, me?.id)).canWork
  );
  const onToggleFilters = (): void => setIsFiltersOpen(!isFiltersOpen);
  const onToggleComposer = (): void => setIsComposerOpen(!isComposerOpen);

  return {
    scope,
    setScope,
    assignee,
    setAssignee,
    assigneeOptions: [
      { value: '', label: 'Все исполнители' },
      ...availablePeople.map((person) => ({
        value: person.id,
        label: person.name,
      })),
    ],
    hasActiveFilters:
      view !== MyPlanView.All ||
      direction !== ContentDirection.All ||
      (scope === MyPlanScope.All && !!assignee),
    isFiltersOpen,
    onToggleFilters,
    isComposerOpen,
    onToggleComposer,
    writableProjects,
    meId: me?.id,
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
