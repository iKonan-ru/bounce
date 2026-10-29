import {
  PanelLeftClose,
  PanelLeftOpen,
  FolderOpen,
  Plus,
  Users,
  DatabaseBackup,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Logo, Avatar } from '@/shared/ui';
import { Link } from '@tanstack/react-router';
import { CREATE_PROJECT_SEARCH } from '../constants/app-shell';
import { useSidebar } from '../hooks/use-sidebar';
import type { SidebarProps } from '../types/app-shell';
import { NavLabel } from './nav-label';
import { SidebarProjectItem } from './sidebar-project-item';

/**
 * Боковая панель (планшет и компьютер)
 *
 * На просторном экране стоит рядом со страницей: развёрнутая или свёрнутая до значков - как
 * оставили. На экране поуже - всегда полоса значков, а развёрнутая ложится поверх страницы и
 * закрывается нажатием мимо, Escape или переходом
 */
export function Sidebar({
  projectId,
  section,
  pathname,
}: SidebarProps): ReactNode {
  const {
    projects,
    avatarUser,
    canCreateProjects,
    isAdmin,
    isWide,
    isFloating,
    itemClassName,
    placeClassName,
    asideClassName,
    headerClassName,
    logoLinkClassName,
    toggleLabel,
    logoTitle,
    projectsLinkClassName,
    newProjectTitle,
    newProjectClassName,
    usersTitle,
    usersClassName,
    backupTitle,
    backupClassName,
    profileTitle,
    profileName,
    profileClassName,
    onToggleClick,
    onBackdropClick,
  } = useSidebar({ pathname });

  return (
    // место панели в строке: на экране поуже - всегда узкая полоса. Поверх страницы панель
    // поднимается вместе с этим местом: sticky - свой слой, z-index внутри него не помогает
    <div className={placeClassName}>
      {isFloating && (
        <button
          type="button"
          aria-label="Свернуть панель"
          tabIndex={-1}
          onClick={onBackdropClick}
          className="fixed inset-0 cursor-default bg-black/20 animate-in fade-in-0"
        />
      )}
      <aside className={asideClassName}>
        <div className={headerClassName}>
          <Link to="/projects" title={logoTitle} className={logoLinkClassName}>
            <Logo className="size-7" />
            {isWide && (
              <span className="font-semibold tracking-tight">Bounce</span>
            )}
          </Link>
          <button
            type="button"
            onClick={onToggleClick}
            aria-label={toggleLabel}
            title={toggleLabel}
            aria-expanded={isWide}
            className="flex size-8 items-center justify-center rounded-lg text-dim transition-colors hover:bg-groove/60 hover:text-ink"
          >
            {isWide ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeftOpen className="size-4" />
            )}
          </button>
        </div>

        <nav aria-label="Проекты" className="flex flex-col gap-1">
          {isWide ? (
            <Link
              to="/projects"
              className="px-2 pb-1 text-xs font-medium tracking-wide text-dim uppercase hover:text-ink"
            >
              Проекты
            </Link>
          ) : (
            <Link
              to="/projects"
              title="Проекты"
              className={projectsLinkClassName}
            >
              <FolderOpen className="size-4" strokeWidth={1.75} />
              <span className="sr-only">Проекты</span>
            </Link>
          )}
          {projects?.map((project) => (
            <SidebarProjectItem
              key={project.id}
              project={project}
              currentProjectId={projectId}
              section={section}
              isWide={isWide}
              itemClassName={itemClassName}
            />
          ))}
          {canCreateProjects && (
            <Link
              to="/projects"
              search={CREATE_PROJECT_SEARCH}
              title={newProjectTitle}
              className={newProjectClassName}
            >
              <Plus className="size-4 shrink-0" />
              <NavLabel text="Новый проект" isWide={isWide} />
            </Link>
          )}
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          {isAdmin && (
            <>
              <Link
                to="/admin/users"
                title={usersTitle}
                className={usersClassName}
              >
                <Users className="size-4 shrink-0" />
                <NavLabel text="Пользователи" isWide={isWide} />
              </Link>
              <Link
                to="/admin/backup"
                title={backupTitle}
                className={backupClassName}
              >
                <DatabaseBackup className="size-4 shrink-0" />
                <NavLabel text="Резервная копия" isWide={isWide} />
              </Link>
            </>
          )}
          <Link to="/me" title={profileTitle} className={profileClassName}>
            <Avatar user={avatarUser} className="size-7 shrink-0 text-xs" />
            <NavLabel text={profileName} isWide={isWide} />
          </Link>
        </div>
      </aside>
    </div>
  );
}
