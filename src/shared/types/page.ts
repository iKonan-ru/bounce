import type { ReactNode, ComponentProps } from 'react';
import type { LinkProps } from '@tanstack/react-router';
import type { Button } from '../ui/kit/button';

/** Хлебная крошка: подпись и ссылка */
export interface Crumb {
  label: string;
  link: LinkProps;
}

/** Ссылка на страницу настроек того, что показано */
export interface PageHeaderEdit {
  link: LinkProps;
  /** Подпись карандаша для экранного диктора и подсказки */
  label: string;
}

/** Пропсы шапки страницы */
export interface PageHeaderProps {
  crumbs: readonly Crumb[];
  title: ReactNode;
  /** Картинка слева от заголовка: обложка песни, аватар проекта */
  media?: ReactNode;
  /** Тихая строка под заголовком */
  meta?: ReactNode;
  /** Действия справа от заголовка: одно главное, остальное - тихие кнопки и меню */
  actions?: ReactNode;
  /** Блок под шапкой во всю ширину (на компьютере - под заголовком, рядом с картинкой) */
  below?: ReactNode;
  /** Карандаш рядом с заголовком: страница настроек того, что показано */
  edit?: PageHeaderEdit | undefined;
}

/** Пропсы хлебной крошки */
export interface CrumbItemProps {
  crumb: Crumb;
  /** Место в пути: перед всеми, кроме первой, - стрелка */
  index: number;
}

/** Пропсы двух колонок */
export interface ColumnsProps {
  main: ReactNode;
  /** Боковая колонка: на узком экране - под основной */
  side: ReactNode;
}

/** Пропсы секции */
export interface SectionProps {
  title?: ReactNode;
  /** Действие справа в строке заголовка */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Пропсы кнопки в строке заголовка секции */
export interface SectionButtonProps extends ComponentProps<typeof Button> {
  icon: ReactNode;
}

/** Пропсы пустого состояния */
export interface EmptyStateProps {
  /** Пояснение, почему пусто */
  children: ReactNode;
  /** Кнопка первого действия */
  action?: ReactNode;
}
