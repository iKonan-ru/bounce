import { useEffect } from 'react';
import {
  rememberProject,
  rememberDirection,
  ProjectDirection,
} from '@/entities/project';
import { useIsOnline, useMe } from '@/shared/hooks';
import { useParams, useLocation } from '@tanstack/react-router';
import {
  NOTES_PATH_RE,
  PLAN_PATH_RE,
  SETTINGS_PATH_RE,
} from '../constants/app-shell';
import type { UseAppLayoutResult } from '../types/app-shell';
import { ProjectSection } from '../types/app-shell';

/** Раздел проекта по адресу: /p/id и всё про песни - "Песни" */
function getSection(pathname: string): ProjectSection {
  if (/^\/p\/[^/]+\/videos/.test(pathname)) {
    return ProjectSection.Videos;
  }

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

/** Адрес, текущий проект и раздел, проект для вкладок */
export function useAppLayout(): UseAppLayoutResult {
  const me = useMe();
  const params = useParams({ strict: false });
  const { pathname } = useLocation();
  // Во время перехода параметры предыдущего маршрута могут еще быть доступны.
  const projectId =
    params.projectId &&
    (pathname === `/p/${params.projectId}` ||
      pathname.startsWith(`/p/${params.projectId}/`))
      ? params.projectId
      : undefined;
  const section = getSection(pathname);
  const isOnline = useIsOnline();

  useEffect(() => {
    if (projectId) {
      rememberProject(projectId);
    }

    if (projectId && /^\/p\/[^/]+\/(songs|videos)(\/|$)/.test(pathname)) {
      const direction =
        section === ProjectSection.Videos
          ? ProjectDirection.video
          : ProjectDirection.music;
      rememberDirection(me?.id ?? '', projectId, direction);
    }
  }, [projectId, section, pathname, me?.id]);
  const tabProjectId = projectId;
  let tabSection: ProjectSection | undefined;

  if (projectId) {
    tabSection = section;
  }

  return { projectId, pathname, section, isOnline, tabProjectId, tabSection };
}
