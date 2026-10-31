import type { ReactNode } from 'react';
import { useSegmentedIndicator } from '@/shared/hooks';
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
        <span className={pillClassName} data-selected={item.isCurrent}>
          <Icon
            className="size-5 transition-transform duration-200 group-active/tab:scale-90 motion-reduce:transition-none"
            strokeWidth={1.75}
          />
        </span>
        {item.label}
      </Link>
    </li>
  );
}

/** Одно нижнее меню на всех страницах приложения */
export function TabBar(props: TabBarProps): ReactNode {
  const items = useTabBar(props);
  const groupRef = useSegmentedIndicator<HTMLElement>();

  return (
    <nav
      ref={groupRef}
      aria-label="Разделы"
      className="mobile-tab-bar segmented-motion fixed inset-x-0 bottom-0 z-40 border-t bg-console/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden [html[data-typing]_&]:hidden"
    >
      <span aria-hidden="true" className="segmented-indicator" />
      <ul className="grid grid-cols-4">
        {items.map((item) => (
          <TabBarItem key={item.label} item={item} />
        ))}
      </ul>
    </nav>
  );
}
