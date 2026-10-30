import type { CSSProperties } from 'react';
import { projectsQuery } from '@/entities/project';
import { useMe } from '@/shared/hooks';
import { useQuery } from '@tanstack/react-query';
import {
  ADMIN_PATH_PREFIX,
  NO_SECTIONS,
  FIXED_TAB_COUNT,
} from '../constants/app-shell';
import type { TabBarProps, UseTabBarResult } from '../types/app-shell';
import { AppPath, ProjectSection } from '../types/app-shell';
import {
  getProjectSections,
  getAriaCurrent,
  getTabClassName,
  getTabPillClassName,
} from '../utils/app-shell';

/** Какая вкладка текущая, классы вкладок и сетка */
export function useTabBar({
  projectId,
  pathname,
}: Omit<TabBarProps, 'section'>): UseTabBarResult {
  const me = useMe();
  const projects = useQuery(projectsQuery);
  const project = projects.data?.find(
    (candidate) => candidate.id === projectId
  );
  const isOnMyPlan = pathname === AppPath.MyPlan;
  const isOnProjects = pathname === AppPath.Projects;
  const isOnProfile = pathname === AppPath.Me;
  const isOnAdmin = pathname.startsWith(ADMIN_PATH_PREFIX);
  const isOnMe = isOnProfile || isOnAdmin;
  let sections = NO_SECTIONS;

  if (project) {
    sections = getProjectSections(project);
  }

  const directions = sections.filter(
    (item) =>
      item.id === ProjectSection.Songs || item.id === ProjectSection.Videos
  );
  const hasDirectionMenu = directions.length > 1;

  if (hasDirectionMenu) {
    sections = sections.filter((item) => !directions.includes(item));
  }

  const sectionCount = sections.length + (hasDirectionMenu ? 1 : 0);
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${sectionCount + FIXED_TAB_COUNT + (projectId ? 0 : 1)}, minmax(0, 1fr))`,
  };

  return {
    avatarUser: me ?? undefined,
    sections,
    directions,
    hasDirectionMenu,
    gridStyle,
    myPlanAriaCurrent: getAriaCurrent(isOnMyPlan),
    myPlanTabClassName: getTabClassName(isOnMyPlan),
    myPlanPillClassName: getTabPillClassName(isOnMyPlan),
    projectsAriaCurrent: getAriaCurrent(isOnProjects),
    projectsTabClassName: getTabClassName(isOnProjects),
    projectsPillClassName: getTabPillClassName(isOnProjects),
    meAriaCurrent: getAriaCurrent(isOnMe),
    meTabClassName: getTabClassName(isOnMe),
    mePillClassName: getTabPillClassName(isOnMe),
  };
}
