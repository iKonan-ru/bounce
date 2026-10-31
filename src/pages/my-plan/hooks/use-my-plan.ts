import { useState } from 'react';
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
import { useWorkspaceNavigation } from '@/features/workspace-navigation';
import { useMe, useIsOnline, useStoredChoice } from '@/shared/hooks';
import { ContentDirection } from '@/shared/types';
import { useProjectCrumbs } from '@/widgets/page-crumbs';
import { groupPlanItems } from '@/widgets/plan';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { MyPlanView, MyPlanScope } from '../types/my-plan';
import type { MyProjectData } from '../types/my-plan';
import { getMyPlanEntries } from '../utils/entries';
import {
  parseScope,
  parseView,
  parseDirection,
  parseId,
} from '../utils/preferences';

/** Задачи, этапы и публикации текущего проекта */
export function useMyPlan() {
  const me = useMe();
  const isOnline = useIsOnline();
  const { projectId } = useParams({ from: '/app/p/$projectId' });
  const navigation = useWorkspaceNavigation('plan');
  const crumbs = useProjectCrumbs(projectId);
  const key = `bounce.plan.${me?.id ?? ''}.${projectId}`;
  const [view, setView] = useStoredChoice(
    `${key}.view`,
    parseView,
    MyPlanView.All
  );
  const defaultScope = MyPlanScope.All;
  const [scope, setScope] = useStoredChoice(
    `${key}.scope`,
    (raw) => (raw ? parseScope(raw) : defaultScope),
    defaultScope
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
  const projectQuery = useQuery(projectsQuery);
  const projects = (projectQuery.data ?? []).filter((project) =>
    getProjectRole(project, me?.id)
  );
  const visibleProjects = projects.filter(
    (project) => project.id === projectId
  );
  const [openedId, setOpenedId] = useState<string>();
  const songs = useQueries({
    queries: visibleProjects.map((project) => ({
      ...songsQuery(project.id),
      enabled: project.directions.includes(ProjectDirection.music),
    })),
  });
  const videos = useQueries({
    queries: visibleProjects.map((project) => ({
      ...videosQuery(project.id),
      enabled: project.directions.includes(ProjectDirection.video),
    })),
  });
  const tasks = useQueries({
    queries: visibleProjects.map((project) => tasksQuery(project.id)),
  });
  const posts = useQueries({
    queries: visibleProjects.map((project) => ({
      ...postsQuery(project.id),
      enabled:
        project.music_release_enabled &&
        project.directions.includes(ProjectDirection.music),
    })),
  });
  const videoPosts = useQueries({
    queries: visibleProjects.map((project) => ({
      ...videoPostsQuery(project.id),
      enabled: project.directions.includes(ProjectDirection.video),
    })),
  });
  const data: MyProjectData[] = visibleProjects.map((project, index) => {
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
  const availablePeople = (people.data ?? []).filter((person) =>
    projects.some(
      (project) =>
        project.id === projectId && getProjectRole(project, person.id)
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
      view === MyPlanView.All ||
      (view === MyPlanView.Tasks) === (entry.kind === 'work')
  );
  const groups = groupPlanItems(
    filtered.filter((entry) => !entry.isDone),
    new Date()
  );
  const done = filtered
    .filter((entry) => entry.isDone)
    .toSorted((a, b) => b.due.localeCompare(a.due));
  const isLoading =
    isOnline &&
    (projectQuery.isPending ||
      data.some((item) => item.isIncomplete && item.isFetching));
  const isError = projectQuery.isError || data.some((item) => item.isError);
  const isIncomplete =
    !projectQuery.data || data.some((item) => item.isIncomplete);
  const opened = entries.find((entry) => entry.id === openedId);
  const onClose = (): void => setOpenedId(undefined);
  const onOpen = (id: string): void => setOpenedId(id);
  const writableProjects = projects.filter(
    (project) => getAbilities(getProjectRole(project, me?.id)).canWork
  );
  const onToggleFilters = (): void => setIsFiltersOpen(!isFiltersOpen);
  const onToggleComposer = (): void => setIsComposerOpen(!isComposerOpen);

  return {
    navigation,
    crumbs,
    canCreate: writableProjects.some((project) => project.id === projectId),
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
  };
}
