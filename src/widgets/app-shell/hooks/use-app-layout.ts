import { useEffect } from 'react';
import {
  rememberProject,
  rememberDirection,
  ProjectDirection,
} from '@/entities/project';
import { useIsOnline, useMe } from '@/shared/hooks';
import { useLocation } from '@tanstack/react-router';
import {
  NOTES_PATH_RE,
  PLAN_PATH_RE,
  SETTINGS_PATH_RE,
} from '../constants/app-shell';
import type { UseAppLayoutResult } from '../types/app-shell';
import { ProjectSection } from '../types/app-shell';

/** Раздел проекта по адресу: /p/id и всё про песни - "Песни" */
function getSection(pathname: string): ProjectSection {
  if (/^\/p\/[^/]+\/tasks/.test(pathname)) {
    return ProjectSection.Tasks;
  }

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
  const { pathname } = useLocation();
  // Адрес обновляется раньше параметров маршрута: всё выделение берём из одного снимка.
  const projectId = /^\/p\/([^/]+)(?:\/|$)/.exec(pathname)?.[1];
  const section = getSection(pathname);
  const isOnline = useIsOnline();

  useEffect(() => {
    if (projectId) {
      rememberProject(projectId);
    }

    if (projectId && /^\/p\/[^/]+\/(songs|videos|tasks)(\/|$)/.test(pathname)) {
      let direction: ProjectDirection = ProjectDirection.music;

      if (section === ProjectSection.Tasks) {
        direction = ProjectDirection.other;
      } else if (section === ProjectSection.Videos) {
        direction = ProjectDirection.video;
      }

      rememberDirection(me?.id ?? '', projectId, direction);
    }
  }, [projectId, section, pathname, me?.id]);
  const tabProjectId = projectId;
  let tabSection: ProjectSection | undefined;

  if (projectId) {
    tabSection = section;
  }

  // Списки музыки и видео используют общую шапку проекта.
  const pageKey = pathname.replace(
    /^(\/p\/[^/]+)\/(songs|videos|tasks)\/?$/,
    '$1/materials'
  );

  return {
    projectId,
    pathname,
    pageKey,
    section,
    isOnline,
    tabProjectId,
    tabSection,
  };
}
