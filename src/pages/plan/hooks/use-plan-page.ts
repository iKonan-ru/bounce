import { useState } from 'react';
import { useAccess } from '@/entities/project';
import type { SongWithStages } from '@/entities/song';
import { getOrderedStages, songsQuery } from '@/entities/song';
import type { Task } from '@/entities/task';
import { tasksQuery } from '@/entities/task';
import { useMe, useStoredChoice } from '@/shared/hooks';
import { useProjectCrumbs } from '@/widgets/page-crumbs';
import {
  PlanItemKind,
  getPlanItems,
  groupPlanItems,
  getDoneTasks,
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

  const songList = songs.data ?? [];
  const taskList = tasks.data ?? [];
  const isMine = scope === PlanScope.Mine;
  const mineId = isMine ? me?.id : undefined;
  const items = getPlanItems(songList, taskList, mineId);
  const groups = groupPlanItems(items, new Date());
  const doneTasks = getDoneTasks(taskList, mineId);
  const isLoading = songs.isPending || tasks.isPending;
  const isNothingPlanned = groups.length === 0 && doneTasks.length === 0;
  const isEmpty = !isLoading && isNothingPlanned;

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
    crumbs,
    meId: me?.id,
    canWork: access.canWork,
    scope,
    setScope,
    isMine,
    view,
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
