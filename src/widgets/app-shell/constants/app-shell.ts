import { Disc3, ListChecks, MessagesSquare } from 'lucide-react';
import { cn } from '@/shared/utils';
import type { SectionItem } from '../types/app-shell';
import { ProjectSection } from '../types/app-shell';

/** Настройки проекта открываются карандашом у его названия, в меню их нет */
export const SECTIONS: readonly SectionItem[] = [
  { id: ProjectSection.Songs, label: 'Песни', icon: Disc3 },
  { id: ProjectSection.Plan, label: 'План', icon: ListChecks },
  { id: ProjectSection.Notes, label: 'Заметки', icon: MessagesSquare },
];

/** Вне проекта разделов во вкладках нет */
export const NO_SECTIONS: readonly SectionItem[] = [];

/** Адрес заметок проекта */
export const NOTES_PATH_RE = /^\/p\/[^/]+\/notes/;

/** Адрес плана проекта */
export const PLAN_PATH_RE = /^\/p\/[^/]+\/plan/;

/** Адрес настроек проекта */
export const SETTINGS_PATH_RE = /^\/p\/[^/]+\/settings/;

/** Начало адресов страниц администратора */
export const ADMIN_PATH_PREFIX = '/admin';

/** Вкладки внизу помимо разделов проекта: проекты и профиль */
export const FIXED_TAB_COUNT = 2;

/** Ключ состояния боковой панели в localStorage */
export const SIDEBAR_KEY = 'bounce.sidebar';

/** CSS-переменная ширины места панели */
export const SIDEBAR_WIDTH_VAR = '--sidebar';

/** Ширина развёрнутой панели */
export const SIDEBAR_WIDE_WIDTH = '15rem';

/** Ширина панели, свёрнутой до значков */
export const SIDEBAR_NARROW_WIDTH = '4rem';

/** Клавиша, которая закрывает панель поверх страницы */
export const ESCAPE_KEY = 'Escape';

/** Параметры адреса, которые открывают создание проекта */
export const CREATE_PROJECT_SEARCH = { create: true };

/**
 * Содержимое страницы: колонкой во всю высоту, чтобы страница могла прижать свой последний
 * блок к низу (mt-auto)
 */
export const MAIN_CLASS_NAME = cn(
  'mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col px-4 pt-[max(env(safe-area-inset-top),0.75rem)] md:px-8 md:pt-6 lg:px-10',
  'pb-28 md:pb-12'
);
