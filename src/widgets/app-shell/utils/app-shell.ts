import { cn } from '@/shared/utils';
import type { SectionLink } from '../types/app-shell';
import { ProjectSection } from '../types/app-shell';

/** Ссылка на раздел проекта */
export function getSectionLink(
  id: ProjectSection,
  projectId: string
): SectionLink {
  if (id === ProjectSection.Notes) {
    return { to: '/p/$projectId/notes', params: { projectId } };
  }

  if (id === ProjectSection.Plan) {
    return { to: '/p/$projectId/plan', params: { projectId } };
  }

  return { to: '/p/$projectId', params: { projectId } };
}

/** Отметка текущей страницы для экранного диктора */
export function getAriaCurrent(isCurrent: boolean): 'page' | undefined {
  if (!isCurrent) {
    return undefined;
  }

  return 'page';
}

/** Вкладка внизу */
export function getTabClassName(isCurrent: boolean): string {
  return cn(
    'group/tab flex flex-col items-center gap-1 py-2 text-[0.6875rem] transition-colors active:text-ink',
    { 'font-medium text-ink': isCurrent, 'text-dim': !isCurrent }
  );
}

/** Подложка под значком текущей вкладки */
export function getTabPillClassName(isCurrent: boolean): string {
  return cn(
    'flex h-7 w-14 items-center justify-center rounded-full transition-[background-color,transform] duration-200 group-active/tab:scale-90',
    { 'bg-groove': isCurrent, 'bg-transparent': !isCurrent }
  );
}

/** Ссылка панели: текущая выделена подложкой */
export function getNavLinkClassName(
  itemClassName: string,
  isCurrent: boolean
): string {
  return cn(itemClassName, {
    'bg-groove font-medium text-ink': isCurrent,
    'text-dim hover:bg-groove/60 hover:text-ink': !isCurrent,
  });
}

/** Всплывающая подсказка пункта: только в свёрнутой панели */
export function getNavTip(text: string, isWide: boolean): string | undefined {
  if (isWide) {
    return undefined;
  }

  return text;
}
