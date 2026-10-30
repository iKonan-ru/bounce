import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useTabBar } from '../hooks/use-tab-bar';
import type { MobileTabProps, TabBarProps } from '../types/app-shell';
import {
  getAriaCurrent,
  getTabClassName,
  getTabPillClassName,
} from '../utils/app-shell';

/** Пункт сохраняет положение при переходе между проектом, планом и профилем */
function TabBarItem({ item }: MobileTabProps): ReactNode {
  const Icon = item.icon;
  const ariaCurrent = getAriaCurrent(item.isCurrent);
  const className = getTabClassName(item.isCurrent);
  const pillClassName = getTabPillClassName(item.isCurrent);

  return (
    <li>
      <Link {...item.link} aria-current={ariaCurrent} className={className}>
        <span className={pillClassName}>
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
        {item.label}
      </Link>
    </li>
  );
}

/** Одно нижнее меню на всех страницах приложения */
export function TabBar(props: TabBarProps): ReactNode {
  const items = useTabBar(props);

  return (
    <nav
      aria-label="Разделы"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-console/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden [html[data-typing]_&]:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => (
          <TabBarItem key={item.label} item={item} />
        ))}
      </ul>
    </nav>
  );
}
