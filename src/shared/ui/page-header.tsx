import { Pencil, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { EXACT_ACTIVE_OPTIONS } from '../constants/page';
import type { PageHeaderProps, CrumbItemProps } from '../types/page';

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
  const hasCrumbs = crumbs.length > 0;

  return (
    <header className="mb-6 md:mb-8">
      {hasCrumbs && (
        <div className="mb-3 flex min-h-9 items-center gap-3">
          <nav aria-label="Путь" className="min-w-0 flex-1">
            <ol className="flex min-w-0 items-center gap-0.5 overflow-x-auto text-sm text-dim [scrollbar-width:none]">
              {crumbs.map((crumb, index) => {
                const crumbKey = crumb.label + String(index);

                return <CrumbItem key={crumbKey} crumb={crumb} index={index} />;
              })}
            </ol>
          </nav>
        </div>
      )}
      <div className="flex items-start gap-4">
        {media}
        <div className="min-w-0 flex-1 self-center">
          <h1 className="text-[1.625rem] leading-tight font-semibold tracking-tight text-balance break-words">
            {title}
            {edit && (
              <Link
                {...edit.link}
                aria-label={edit.label}
                title={edit.label}
                className="ml-1.5 inline-flex size-8 -translate-y-0.5 items-center justify-center rounded-lg align-middle text-dim transition-colors hover:bg-groove hover:text-ink"
              >
                <Pencil className="size-4" />
              </Link>
            )}
          </h1>
          {meta && <div className="mt-1.5 text-sm text-dim">{meta}</div>}
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
