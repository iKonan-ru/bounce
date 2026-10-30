import { Layers } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/ui';
import { Link } from '@tanstack/react-router';
import type { DirectionMenuProps } from '../types/app-shell';
import {
  getSectionLink,
  getTabClassName,
  getTabPillClassName,
} from '../utils/app-shell';

/** Два направления занимают одну вкладку, план и заметки остаются на месте */
export function DirectionMenu({
  items,
  projectId,
  currentSection,
}: DirectionMenuProps): ReactNode {
  const isCurrent = items.some((item) => item.id === currentSection);
  const buttonClass = getTabClassName(isCurrent);
  const pillClass = getTabPillClassName(isCurrent);

  return (
    <li>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={`${buttonClass} w-full`}>
            <span className={pillClass}>
              <Layers className="size-5" />
            </span>
            Разделы
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="center" className="min-w-44">
          {items.map((item) => {
            const Icon = item.icon;
            const link = getSectionLink(item.id, projectId);

            return (
              <DropdownMenuItem key={item.id} asChild>
                <Link {...link}>
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
