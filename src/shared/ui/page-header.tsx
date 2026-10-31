import { Settings, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useContext } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@tanstack/react-router';
import { EXACT_ACTIVE_OPTIONS } from '../constants/page';
import type { PageHeaderProps, CrumbItemProps } from '../types/page';
import { Button } from './kit/button';
import { MobileCrumbsContext } from './mobile-crumbs-context';

/** Шапка страницы: хлебные крошки (путь от списка проектов), заголовок и действия */
export function PageHeader({
  crumbs,
  title,
  media,
  meta,
  actions,
  below,
  edit,
}: PageHeaderProps): ReactNode {
  const titleParts =
    edit && typeof title === 'string'
      ? /^(.*[\s-])?([^\s-]+)\s*$/s.exec(title)
      : null;
  // Короткий хвост держит иконку рядом с текстом даже при переносе длинного слова.
  const titleTail = Array.from(titleParts?.[2] ?? '');
  const titlePrefix = (titleParts?.[1] ?? '') + titleTail.slice(0, -4).join('');
  const titleEnd = titleParts ? titleTail.slice(-4).join('') : title;
  const titleClassName = media
    ? 'min-w-0 flex-1 pt-2 md:pt-6'
    : 'min-w-0 flex-1 self-center';
  const mobileCrumbsTarget = useContext(MobileCrumbsContext);
  const crumbsNav = crumbs.length > 0 && (
    <nav aria-label="Путь" className="min-w-0 flex-1">
      <ol className="flex min-w-0 items-center gap-0.5 overflow-x-auto text-sm text-dim [scrollbar-width:none]">
        {crumbs.map((crumb, index) => {
          const crumbKey = crumb.label + String(index);

          return <CrumbItem key={crumbKey} crumb={crumb} index={index} />;
        })}
      </ol>
    </nav>
  );

  return (
    <header className="mb-6 md:mb-8">
      {mobileCrumbsTarget && createPortal(crumbsNav, mobileCrumbsTarget)}
      {crumbsNav && (
        <div className="mb-3 hidden min-h-9 items-center gap-3 md:flex">
          {crumbsNav}
        </div>
      )}
      <div className="flex items-start gap-4">
        {media}
        <div className={titleClassName}>
          <h1 className="text-[1.625rem] leading-tight font-semibold tracking-tight text-pretty break-words">
            {titlePrefix}
            <span className="inline-flex max-w-full items-end align-bottom">
              <span className="min-w-0">{titleEnd}</span>
              {edit && (
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="ml-1 inline-flex size-8 shrink-0 text-dim"
                >
                  <Link
                    {...edit.link}
                    aria-label={edit.label}
                    title={edit.label}
                  >
                    <Settings className="size-5" />
                  </Link>
                </Button>
              )}
            </span>
          </h1>
          {meta && (
            <div className="mt-1.5 min-h-6 text-sm text-dim">{meta}</div>
          )}
          {below && <div className="mt-3 hidden sm:block">{below}</div>}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        )}
      </div>
      {below && <div className="mt-4 sm:hidden">{below}</div>}
    </header>
  );
}

/** Хлебная крошка: стрелка от предыдущей и ссылка */
function CrumbItem({ crumb, index }: CrumbItemProps): ReactNode {
  const hasArrow = index > 0;

  return (
    <li className="flex min-w-0 shrink-0 items-center gap-0.5">
      {hasArrow && <ChevronRight className="size-3.5 shrink-0 opacity-60" />}
      <Link
        {...crumb.link}
        activeOptions={EXACT_ACTIVE_OPTIONS}
        className="block max-w-[11rem] truncate rounded-md px-1.5 py-1 transition-colors hover:bg-groove/60 hover:text-ink"
      >
        {crumb.label}
      </Link>
    </li>
  );
}
