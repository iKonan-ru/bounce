import { useEffect } from 'react';
import {
  projectsQuery,
  rememberProject,
  getLastProject,
} from '@/entities/project';
import { useIsOnline } from '@/shared/hooks';
import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from '@tanstack/react-router';
import {
  NOTES_PATH_RE,
  PLAN_PATH_RE,
  SETTINGS_PATH_RE,
} from '../constants/app-shell';
import type { ProjectWithId, UseAppLayoutResult } from '../types/app-shell';
import { ProjectSection } from '../types/app-shell';

/** Раздел проекта по адресу: /p/id и всё про песни - "Песни" */
function getSection(pathname: string): ProjectSection {
  if (NOTES_PATH_RE.test(pathname)) {
    return ProjectSection.Notes;
  }

  if (PLAN_PATH_RE.test(pathname)) {
    return ProjectSection.Plan;
  }

  if (SETTINGS_PATH_RE.test(pathname)) {
    return ProjectSection.Settings;
  }

  return ProjectSection.Songs;
}

/** Проект для вкладок вне проекта: последний открытый, если он в списке, иначе единственный */
function getFallbackProject(
  list: readonly ProjectWithId[],
  remembered: string | null
): string | undefined {
  if (remembered) {
    const isRememberedListed = list.some(
      (project) => project.id === remembered
    );

    if (isRememberedListed) {
      return remembered;
    }
  }

  if (list.length === 1) {
    return list[0]?.id;
  }

  return undefined;
}

/** Адрес, текущий проект и раздел, проект для вкладок */
export function useAppLayout(): UseAppLayoutResult {
  const params = useParams({ strict: false });
  const projectId = params.projectId;
  const { pathname } = useLocation();
  const section = getSection(pathname);
  const isOnline = useIsOnline();

  const projects = useQuery(projectsQuery);
  useEffect(() => {
    if (projectId) {
      rememberProject(projectId);
    }
  }, [projectId]);
  // вкладки проекта внизу и вне проекта ведут в последний открытый (или единственный) проект
  const remembered = getLastProject();
  const list = projects.data ?? [];
  const tabProjectId = projectId ?? getFallbackProject(list, remembered);
  let tabSection: ProjectSection | undefined;

  if (projectId) {
    tabSection = section;
  }

  return { projectId, pathname, section, isOnline, tabProjectId, tabSection };
}
