import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState, useEffect, useId } from 'react';
import {
  ProjectAvatar,
  getProjectRole,
  getAbilities,
} from '@/entities/project';
import { useMe } from '@/shared/hooks';
import {
  Collapse,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { Link, useLocation } from '@tanstack/react-router';
import type {
  SidebarSectionItemProps,
  SidebarProjectItemProps,
} from '../types/app-shell';
import { ProjectSection } from '../types/app-shell';
import {
  getProjectSections,
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
  const me = useMe();
  const access = getAbilities(getProjectRole(project, me?.id));
  const { pathname } = useLocation();
  const [isExpanded, setIsExpanded] = useState(isCurrent);
  const groupId = useId();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const onMenuOpenChange = (isOpen: boolean): void => {
    setIsMenuOpen(!isWide && isOpen);
  };
  const sections = getProjectSections(project).filter(
    (item) => item.id !== ProjectSection.Settings || access.canEdit
  );
  const onToggle = (): void => setIsExpanded((value) => !value);

  useEffect(() => {
    if (isCurrent) {
      setIsExpanded(true);
    }
  }, [isCurrent, pathname]);

  const buttonClassName = cn(itemClassName, 'relative', {
    'font-semibold text-ink before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-ink':
      isCurrent,
    'text-dim': !isCurrent,
    'hover:bg-groove/60 hover:text-ink': true,
  });
  const avatarClassName = cn('size-7 shrink-0 rounded-md text-xs', {
    'ring-2 ring-border ring-offset-2 ring-offset-panel': isCurrent,
  });
  const avatar = (
    <ProjectAvatar project={project} className={avatarClassName} />
  );

  return (
    <div className="flex flex-col">
      <DropdownMenu
        open={!isWide && isMenuOpen}
        onOpenChange={onMenuOpenChange}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={isWide ? onToggle : undefined}
            aria-label={project.name}
            title={isWide ? undefined : project.name}
            aria-expanded={isWide ? isExpanded : isMenuOpen}
            aria-controls={isWide ? groupId : undefined}
            aria-haspopup={isWide ? undefined : 'menu'}
            className={buttonClassName}
          >
            {avatar}
            <NavLabel text={project.name} isWide={isWide} />
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'ml-auto size-4 shrink-0 text-dim transition-[transform,opacity] motion-reduce:transition-none',
                { '-rotate-90': !isExpanded, 'opacity-0': !isWide }
              )}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuLabel className="truncate">
            {project.name}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sections.map((item) => {
            const SectionIcon = item.icon;
            const isActive = isCurrent && section === item.id;

            return (
              <DropdownMenuItem key={item.id} asChild className="gap-2.5">
                <Link
                  {...getSectionLink(item.id, project.id)}
                  aria-current={getAriaCurrent(isActive)}
                >
                  <SectionIcon className="size-4" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {isActive && <Check className="size-4 shrink-0" />}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <Collapse isOpen={isWide && isExpanded}>
        <ul id={groupId} className="mt-0.5 mb-2 flex flex-col gap-0.5 pl-4">
          {sections.map((item) => (
            <SidebarSectionItem
              key={item.id}
              item={item}
              projectId={project.id}
              currentSection={isCurrent ? section : undefined}
              isWide={isWide}
              itemClassName={itemClassName}
            />
          ))}
        </ul>
      </Collapse>
    </div>
  );
}
