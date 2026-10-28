import { Link, type LinkProps } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from '@/components/avatar';
import { useMe } from '@/lib/auth';
import { cn } from '@/lib/utils';

export type Crumb = { label: string; link: LinkProps };

type Props = {
  crumbs: ReadonlyArray<Crumb>;
  title: ReactNode;
  // картинка слева от заголовка: обложка песни, аватар проекта
  media?: ReactNode;
  // строка под заголовком
  meta?: ReactNode;
  actions?: ReactNode;
};

// Шапка страницы: хлебные крошки (путь от списка проектов), заголовок и действия. На телефоне в
// строке крошек ещё и вход в профиль: боковой панели там нет.
export function PageHeader({ crumbs, title, media, meta, actions }: Props) {
  const me = useMe();
  return (
    <header className="mb-6">
      <div className="mb-3 flex min-h-10 items-center gap-3">
        <nav aria-label="Путь" className="min-w-0 flex-1">
          <ol className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm text-dim [scrollbar-width:none]">
            {crumbs.map((c, i) => (
              <li key={c.label + String(i)} className="flex shrink-0 items-center gap-1">
                {i > 0 && <ChevronRight className="size-3.5 shrink-0" />}
                <Link
                  {...c.link}
                  activeOptions={{ exact: true }}
                  className="block max-w-[14rem] truncate rounded-md px-1 py-1 hover:text-ink"
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <Link to="/me" aria-label="Профиль" className="shrink-0 rounded-full md:hidden">
          <Avatar name={me?.name ?? '?'} />
        </Link>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        {media}
        <div className="min-w-0 flex-1 basis-48">
          <h1 className="text-2xl font-semibold tracking-tight text-balance break-words md:text-3xl">
            {title}
          </h1>
          {meta && <div className="mt-2">{meta}</div>}
        </div>
        {actions && (
          <div className={cn('flex shrink-0 flex-wrap items-center gap-2')}>{actions}</div>
        )}
      </div>
    </header>
  );
}

// Две колонки на широком экране; на телефоне и планшете - одна под другой.
export function Columns({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
      <div className="min-w-0">{main}</div>
      <aside className="min-w-0">{side}</aside>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex min-h-10 items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{children}</h2>
      {action}
    </div>
  );
}
