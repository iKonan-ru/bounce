import { useState, useEffect } from 'react';
import { projectsQuery } from '@/entities/project';
import { useMe, useIsRoomyScreen, useStoredChoice } from '@/shared/hooks';
import { cn } from '@/shared/utils';
import { useQuery } from '@tanstack/react-query';
import {
  SIDEBAR_KEY,
  SIDEBAR_WIDE_WIDTH,
  SIDEBAR_NARROW_WIDTH,
  SIDEBAR_WIDTH_VAR,
  ESCAPE_KEY,
} from '../constants/app-shell';
import type { SidebarProps, UseSidebarResult } from '../types/app-shell';
import { SidebarStoredValue, AppPath } from '../types/app-shell';
import { getNavTip, getNavLinkClassName } from '../utils/app-shell';

/** Развёрнута, пока её не свернули */
function parseSidebarOpen(raw: string | null): boolean {
  return raw !== SidebarStoredValue.Closed;
}

/** Состояние панели для хранилища */
function getSidebarValue(isOpen: boolean): string {
  if (isOpen) {
    return SidebarStoredValue.Open;
  }

  return SidebarStoredValue.Closed;
}

/** Пункт панели: в развёрнутой - строкой, в свёрнутой - квадратом со значком */
function getNavItemClassName(isWide: boolean): string {
  return cn('flex min-h-9 items-center rounded-lg text-sm transition-colors', {
    'gap-2.5 px-2': isWide,
    'size-10 justify-center self-center': !isWide,
  });
}

/** Развёрнута ли панель, закрытие поверх страницы, классы и подписи пунктов */
export function useSidebar({
  pathname,
}: Pick<SidebarProps, 'pathname'>): UseSidebarResult {
  const me = useMe();
  const projects = useQuery(projectsQuery);
  const isRoomy = useIsRoomyScreen();
  const [isPinned, setIsPinned] = useStoredChoice(
    SIDEBAR_KEY,
    parseSidebarOpen,
    true,
    getSidebarValue
  );
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const isWide = isRoomy ? isPinned : isOverlayOpen;
  const isFloating = !isRoomy && isOverlayOpen;
  const isPinnedWide = isRoomy && isPinned;

  // ширина места панели - для полосы плеера, закреплённой над низом экрана
  useEffect(() => {
    const width = isPinnedWide ? SIDEBAR_WIDE_WIDTH : SIDEBAR_NARROW_WIDTH;
    document.documentElement.style.setProperty(SIDEBAR_WIDTH_VAR, width);
  }, [isPinnedWide]);

  // переход или переход на просторный экран закрывает панель поверх страницы

  useEffect(() => {
    setIsOverlayOpen(false);
  }, [pathname, isRoomy]);
  useEffect(() => {
    if (!isFloating) {
      return;
    }

    const onDocumentKeyDown = (event: KeyboardEvent): void => {
      if (event.key === ESCAPE_KEY) {
        setIsOverlayOpen(false);
      }
    };
    document.addEventListener('keydown', onDocumentKeyDown);

    return () => document.removeEventListener('keydown', onDocumentKeyDown);
  }, [isFloating]);

  const onToggleClick = (): void => {
    if (!isRoomy) {
      setIsOverlayOpen((isOpen) => !isOpen);

      return;
    }

    // без хранилища панель просто не запомнит выбор
    setIsPinned(!isPinned);
  };
  const onBackdropClick = (): void => {
    setIsOverlayOpen(false);
  };

  const itemClassName = getNavItemClassName(isWide);
  const placeClassName = cn(
    'sticky top-0 hidden h-dvh shrink-0 transition-[width] duration-200 ease-out-soft md:block',
    { 'w-60': isPinnedWide, 'w-16': !isPinnedWide, 'z-50': isFloating }
  );
  const asideClassName = cn(
    'flex h-full flex-col gap-6 overflow-x-hidden overflow-y-auto border-r border-border/70 py-4 transition-[width] duration-200 ease-out-soft dark:border-border/50',
    { 'w-60 px-3': isWide, 'w-16 px-3': !isWide },
    {
      'fixed top-0 left-0 h-dvh bg-console shadow-2xl': isFloating,
      'bg-panel/50 dark:bg-black/10': !isFloating,
    }
  );
  const headerClassName = cn('flex items-center gap-1', {
    'justify-between': isWide,
    'flex-col gap-3': !isWide,
  });
  const logoLinkClassName = cn('flex items-center gap-2', { 'px-2': isWide });
  const toggleLabel = isWide ? 'Свернуть панель' : 'Развернуть панель';
  const isOnUsers = pathname === AppPath.AdminUsers;
  const isOnBackup = pathname === AppPath.AdminBackup;
  const isOnProfile = pathname === AppPath.Me;
  const isOnProjects = pathname === AppPath.Projects;
  const profileClassName = cn(itemClassName, 'mt-2', {
    'bg-groove font-medium text-ink': isOnProfile,
    'text-dim hover:bg-groove/60 hover:text-ink': !isOnProfile,
  });

  return {
    projects: projects.data,
    avatarUser: me ?? undefined,
    canCreateProjects: Boolean(me?.canCreateProjects),
    isAdmin: Boolean(me?.isAdmin),
    isWide,
    isFloating,
    itemClassName,
    placeClassName,
    asideClassName,
    headerClassName,
    logoLinkClassName,
    toggleLabel,
    logoTitle: getNavTip('Bounce', isWide),
    projectsLinkClassName: getNavLinkClassName(itemClassName, isOnProjects),
    newProjectTitle: getNavTip('Новый проект', isWide),
    newProjectClassName: getNavLinkClassName(itemClassName, false),
    usersTitle: getNavTip('Пользователи', isWide),
    usersClassName: getNavLinkClassName(itemClassName, isOnUsers),
    backupTitle: getNavTip('Резервная копия', isWide),
    backupClassName: getNavLinkClassName(itemClassName, isOnBackup),
    profileTitle: getNavTip(me?.name ?? 'Профиль', isWide),
    profileName: me?.name ?? '',
    profileClassName,
    onToggleClick,
    onBackdropClick,
  };
}
