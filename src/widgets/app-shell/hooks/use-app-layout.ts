import { useEffect } from 'react';
import { rememberProject } from '@/entities/project';
import { useIsOnline } from '@/shared/hooks';
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
  const params = useParams({ strict: false });
  const projectId = params.projectId;
  const { pathname } = useLocation();
  const section = getSection(pathname);
  const isOnline = useIsOnline();

  useEffect(() => {
    if (projectId) {
      rememberProject(projectId);
    }
  }, [projectId]);
  const tabProjectId = projectId;
  let tabSection: ProjectSection | undefined;

  if (projectId) {
    tabSection = section;
  }

  return { projectId, pathname, section, isOnline, tabProjectId, tabSection };
}
