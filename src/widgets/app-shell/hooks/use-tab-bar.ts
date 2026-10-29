import type { CSSProperties } from 'react';
import { useMe } from '@/shared/hooks';
import {
  ADMIN_PATH_PREFIX,
  NO_SECTIONS,
  SECTIONS,
  FIXED_TAB_COUNT,
} from '../constants/app-shell';
import type { TabBarProps, UseTabBarResult } from '../types/app-shell';
import { AppPath } from '../types/app-shell';
import {
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
  const isOnProjects = pathname === AppPath.Projects;
  const isOnProfile = pathname === AppPath.Me;
  const isOnAdmin = pathname.startsWith(ADMIN_PATH_PREFIX);
  const isOnMe = isOnProfile || isOnAdmin;
  let sections = NO_SECTIONS;

  if (projectId) {
    sections = SECTIONS;
  }

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${sections.length + FIXED_TAB_COUNT}, minmax(0, 1fr))`,
  };

  return {
    avatarUser: me ?? undefined,
    sections,
    gridStyle,
    projectsAriaCurrent: getAriaCurrent(isOnProjects),
    projectsTabClassName: getTabClassName(isOnProjects),
    projectsPillClassName: getTabPillClassName(isOnProjects),
    meAriaCurrent: getAriaCurrent(isOnMe),
    meTabClassName: getTabClassName(isOnMe),
    mePillClassName: getTabPillClassName(isOnMe),
  };
}
