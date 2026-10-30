import { FolderOpen, CalendarCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from '@/shared/ui';
import { Link } from '@tanstack/react-router';
import { useTabBar } from '../hooks/use-tab-bar';
import type { TabBarSectionItemProps, TabBarProps } from '../types/app-shell';
import {
  getSectionLink,
  getAriaCurrent,
  getTabClassName,
  getTabPillClassName,
} from '../utils/app-shell';
import { DirectionMenu } from './direction-menu';

/** Вкладка раздела текущего проекта */
function TabBarSectionItem({
  item,
  projectId,
  currentSection,
}: TabBarSectionItemProps): ReactNode {
  const isCurrent = currentSection === item.id;
  const sectionLink = getSectionLink(item.id, projectId);
  const ariaCurrent = getAriaCurrent(isCurrent);
  const tabClassName = getTabClassName(isCurrent);
  const pillClassName = getTabPillClassName(isCurrent);
  const SectionIcon = item.icon;

  return (
    <li>
      <Link
        {...sectionLink}
        aria-current={ariaCurrent}
        className={tabClassName}
      >
        <span className={pillClassName}>
          <SectionIcon className="size-5" strokeWidth={1.75} />
        </span>
        {item.label}
      </Link>
    </li>
  );
}

/** Телефон: вкладки внизу на всех страницах - проекты, разделы текущего проекта и профиль */
export function TabBar({
  projectId,
  section,
  pathname,
}: TabBarProps): ReactNode {
  const {
    avatarUser,
    sections,
    directions,
    hasDirectionMenu,
    gridStyle,
    projectsAriaCurrent,
    myPlanAriaCurrent,
    myPlanTabClassName,
    myPlanPillClassName,
    projectsTabClassName,
    projectsPillClassName,
    meAriaCurrent,
    meTabClassName,
    mePillClassName,
  } = useTabBar({ projectId, pathname });

  return (
    <nav
      aria-label="Разделы"
      // пока набирают текст, вкладки не висят над клавиатурой (app/utils/keyboard.ts)
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-console/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden [html[data-typing]_&]:hidden"
    >
      <ul className="grid" style={gridStyle}>
        <li>
          <Link
            to="/projects"
            aria-current={projectsAriaCurrent}
            className={projectsTabClassName}
          >
            <span className={projectsPillClassName}>
              <FolderOpen className="size-5" strokeWidth={1.75} />
            </span>
            Проекты
          </Link>
        </li>
        {!projectId && (
          <li>
            <Link
              to="/my-plan"
              aria-current={myPlanAriaCurrent}
              className={myPlanTabClassName}
            >
              <span className={myPlanPillClassName}>
                <CalendarCheck className="size-5" strokeWidth={1.75} />
              </span>
              Мой план
            </Link>
          </li>
        )}
        {projectId && hasDirectionMenu && (
          <DirectionMenu
            items={directions}
            projectId={projectId}
            currentSection={section}
          />
        )}
        {projectId &&
          sections.map((item) => (
            <TabBarSectionItem
              key={item.id}
              item={item}
              projectId={projectId}
              currentSection={section}
            />
          ))}
        <li>
          <Link
            to="/me"
            aria-current={meAriaCurrent}
            className={meTabClassName}
          >
            <span className={mePillClassName}>
              <Avatar user={avatarUser} className="size-5 text-[0.625rem]" />
            </span>
            Профиль
          </Link>
        </li>
      </ul>
    </nav>
  );
}
