import type { ReactNode } from 'react';
import { ProjectAvatar } from '@/entities/project';
import { cn } from '@/shared/utils';
import { Link } from '@tanstack/react-router';
import { SECTIONS } from '../constants/app-shell';
import type {
  SidebarSectionItemProps,
  SidebarProjectItemProps,
  ProjectParams,
} from '../types/app-shell';
import {
  getSectionLink,
  getAriaCurrent,
  getNavTip,
  getNavLinkClassName,
} from '../utils/app-shell';
import { NavLabel } from './nav-label';

/** Раздел открытого проекта в боковой панели */
function SidebarSectionItem({
  item,
  projectId,
  currentSection,
  isWide,
  itemClassName,
}: SidebarSectionItemProps): ReactNode {
  const isCurrent = currentSection === item.id;
  const sectionLink = getSectionLink(item.id, projectId);
  const ariaCurrent = getAriaCurrent(isCurrent);
  const title = getNavTip(item.label, isWide);
  const linkClassName = getNavLinkClassName(itemClassName, isCurrent);
  const SectionIcon = item.icon;

  return (
    <li className="flex flex-col">
      <Link
        {...sectionLink}
        aria-current={ariaCurrent}
        title={title}
        className={linkClassName}
      >
        <SectionIcon className="size-4 shrink-0" strokeWidth={1.75} />
        <NavLabel text={item.label} isWide={isWide} />
      </Link>
    </li>
  );
}

/** Проект в боковой панели; у открытого - его разделы */
export function SidebarProjectItem({
  project,
  currentProjectId,
  section,
  isWide,
  itemClassName,
}: SidebarProjectItemProps): ReactNode {
  const isCurrent = project.id === currentProjectId;
  const params: ProjectParams = { projectId: project.id };
  const title = getNavTip(project.name, isWide);
  // открытый проект выделен только цветом текста, подсветка - у раздела под ним: ссылка
  // проекта ведёт туда же, куда "Песни", и двойная подсветка путала
  const linkClassName = cn(itemClassName, {
    'text-ink hover:bg-groove/60': isCurrent,
    'text-dim hover:bg-groove/60 hover:text-ink': !isCurrent,
  });
  const sectionsClassName = cn('mt-0.5 mb-2 flex flex-col gap-0.5', {
    'pl-4': isWide,
  });

  return (
    <div className="flex flex-col">
      <Link
        to="/p/$projectId"
        params={params}
        title={title}
        className={linkClassName}
      >
        <ProjectAvatar
          project={project}
          className="size-7 rounded-md text-xs"
        />
        <NavLabel text={project.name} isWide={isWide} />
      </Link>
      {isCurrent && (
        <ul className={sectionsClassName}>
          {SECTIONS.map((item) => (
            <SidebarSectionItem
              key={item.id}
              item={item}
              projectId={project.id}
              currentSection={section}
              isWide={isWide}
              itemClassName={itemClassName}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
