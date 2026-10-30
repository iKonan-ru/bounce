import { useState } from 'react';
import { useProjectPeople, useAccess } from '@/entities/project';
import type { SongWithStages } from '@/entities/song';
import {
  getOrderedStages,
  songsQuery,
  getSongForDisplay,
} from '@/entities/song';
import type { Task } from '@/entities/task';
import { tasksQuery } from '@/entities/task';
import { videosQuery } from '@/entities/video';
import { CONTENT_DIRECTION_OPTIONS } from '@/shared/constants';
import { useMe, useStoredChoice } from '@/shared/hooks';
import { ContentDirection } from '@/shared/types';
import { useProjectCrumbs } from '@/widgets/page-crumbs';
import {
  PlanItemKind,
  getPlanItems,
  groupPlanItems,
  getDoneTasks,
  checkMatchesDirection,
} from '@/widgets/plan';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { SCOPE_STORAGE_KEY, VIEW_STORAGE_KEY } from '../constants/plan';
import type { OpenedItem, OpenedStage, UsePlanPageResult } from '../types/plan';
import { PlanView, PlanScope } from '../types/plan';

/** Сохранённый вид плана; без сохранённого - дела */
function parseView(raw: string | null): PlanView {
  if (raw === PlanView.Content) {
    return PlanView.Content;
  }

  return PlanView.Tasks;
}

/** Сохранённый выбор "чьи"; без сохранённого - все */
function parseScope(raw: string | null): PlanScope {
  if (raw === PlanScope.Mine) {
    return PlanScope.Mine;
  }

  return PlanScope.All;
}

/** Открытая задача, если открыта задача */
function findOpenedTask(
  tasks: readonly Task[],
  opened: OpenedItem | undefined
): Task | undefined {
  if (opened?.kind !== PlanItemKind.Task) {
    return undefined;
  }

  return tasks.find((task) => task.id === opened.id);
}

/** Открытый этап и его песня, если открыт этап */
function findOpenedStage(
  songs: readonly SongWithStages[],
  opened: OpenedItem | undefined
): OpenedStage | undefined {
  if (opened?.kind !== PlanItemKind.Stage) {
    return undefined;
  }

  for (const song of songs) {
    const stage = getOrderedStages(song).find(
      (songStage) => songStage.id === opened.id
    );

    if (stage) {
      return { stage, song };
    }
  }

  return undefined;
}

/** Пункты плана по срокам, фильтр "чьи" и открытый пункт */
export function usePlanPage(): UsePlanPageResult {
  const { projectId } = useParams({ from: '/app/p/$projectId/plan' });
  const me = useMe();
  const access = useAccess(projectId);
  const crumbs = useProjectCrumbs(projectId);
  const songs = useQuery(songsQuery(projectId));
  const tasks = useQuery(tasksQuery(projectId));
  const videos = useQuery({
    ...videosQuery(projectId),
    enabled: access.isVideoEnabled,
  });
  const people = useProjectPeople(projectId);
  const [selectedDirection, setDirection] = useState(ContentDirection.All);
  const isDirectionAvailable =
    (selectedDirection !== ContentDirection.Music || access.isMusicEnabled) &&
    (selectedDirection !== ContentDirection.Video || access.isVideoEnabled);
  const direction = isDirectionAvailable
    ? selectedDirection
    : ContentDirection.All;
  const [assignee, setAssignee] = useState('');
  const [scope, setScope] = useStoredChoice(
    SCOPE_STORAGE_KEY,
    parseScope,
    PlanScope.All
  );
  const [view, setView] = useStoredChoice(
    VIEW_STORAGE_KEY,
    parseView,
    PlanView.Tasks
  );
  const [opened, setOpened] = useState<OpenedItem>();

  const songList = (songs.data ?? []).map((song) =>
    getSongForDisplay(song, access.isReleaseEnabled)
  );
  const taskList = tasks.data ?? [];
  const isMine = scope === PlanScope.Mine;
  const currentAssignee = people.some((person) => person.id === assignee)
    ? assignee
    : '';
  const mineId = isMine ? me?.id : currentAssignee || undefined;
  const assigneeOptions = [
    { value: '', label: 'Все' },
    { value: 'mine', label: 'Мои' },
    ...people
      .filter((person) => person.id !== me?.id)
      .map((person) => ({ value: person.id, label: person.name })),
  ];
  const onAssigneeChange = (value: string): void => {
    setScope(value === 'mine' ? PlanScope.Mine : PlanScope.All);
    setAssignee(value === 'mine' ? '' : value);
  };
  const directionOptions = CONTENT_DIRECTION_OPTIONS.filter(
    (option) =>
      (option.value !== ContentDirection.Music || access.isMusicEnabled) &&
      (option.value !== ContentDirection.Video || access.isVideoEnabled)
  );
  const items = getPlanItems(
    songList,
    taskList,
    mineId,
    videos.data ?? [],
    direction
  );
  const groups = groupPlanItems(items, new Date());
  const doneTasks = getDoneTasks(taskList, mineId).filter((task) =>
    checkMatchesDirection(
      {
        kind: PlanItemKind.Task,
        id: task.id,
        task,
        due: task.due,
        assignees: task.assignees,
      },
      direction
    )
  );
  const isLoading =
    songs.isPending ||
    tasks.isPending ||
    (access.isVideoEnabled && videos.isPending);
  const isNothingPlanned = groups.length === 0 && doneTasks.length === 0;
  const isError =
    songs.isError || tasks.isError || (access.isVideoEnabled && videos.isError);
  const isEmpty = !isLoading && !isError && isNothingPlanned;
  const openedVideo =
    opened?.kind === PlanItemKind.VideoStage
      ? videos.data?.find((video) =>
          video.expand?.video_stages_via_video?.some(
            (stage) => stage.id === opened.id
          )
        )
      : undefined;
  const openedVideoStage = openedVideo?.expand?.video_stages_via_video?.find(
    (stage) => stage.id === opened?.id
  );

  const onItemOpen = (kind: PlanItemKind, id: string): void => {
    setOpened({ kind, id });
  };

  const onTaskOpen = (id: string): void => {
    setOpened({ kind: PlanItemKind.Task, id });
  };

  const onDialogOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      setOpened(undefined);
    }
  };

  return {
    projectId,
    direction,
    setDirection,
    directionOptions,
    assignee: isMine ? 'mine' : currentAssignee,
    assigneeOptions,
    onAssigneeChange,
    isError,
    openedVideo,
    openedVideoStage,
    crumbs,
    meId: me?.id,
    canWork: access.canWork,
    scope,
    setScope,
    isMine,
    view:
      access.isReleaseEnabled || access.isVideoEnabled ? view : PlanView.Tasks,
    hasPublications: access.isReleaseEnabled || access.isVideoEnabled,
    isVideoEnabled: access.isVideoEnabled,
    isReleaseEnabled: access.isReleaseEnabled,
    setView,
    mineId,
    groups,
    doneTasks,
    isLoading,
    isEmpty,
    openedTask: findOpenedTask(taskList, opened),
    openedStage: findOpenedStage(songList, opened),
    onItemOpen,
    onTaskOpen,
    onDialogOpenChange,
  };
}
