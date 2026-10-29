import { Link, type LinkProps } from '@tanstack/react-router';
import { ChevronRight, Pencil } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type Crumb = { label: string; link: LinkProps };

type Props = {
  crumbs: ReadonlyArray<Crumb>;
  title: ReactNode;
  // картинка слева от заголовка: обложка песни, аватар проекта
  media?: ReactNode;
  // тихая строка под заголовком
  meta?: ReactNode;
  // действия справа от заголовка: одно главное, остальное - тихие кнопки и меню
  actions?: ReactNode;
  // блок под шапкой во всю ширину (на компьютере - под заголовком, рядом с картинкой)
  below?: ReactNode;
  // карандаш рядом с заголовком: страница настроек того, что показано
  edit?: { link: LinkProps; label: string };
};

// Шапка страницы: хлебные крошки (путь от списка проектов), заголовок и действия.
export function PageHeader({ crumbs, title, media, meta, actions, below, edit }: Props) {
  return (
    <header className="mb-6 md:mb-8">
      {crumbs.length > 0 && (
        <div className="mb-3 flex min-h-9 items-center gap-3">
          <nav aria-label="Путь" className="min-w-0 flex-1">
            <ol className="flex min-w-0 items-center gap-0.5 overflow-x-auto text-sm text-dim [scrollbar-width:none]">
              {crumbs.map((c, i) => (
                <li
                  key={c.label + String(i)}
                  className="flex min-w-0 shrink-0 items-center gap-0.5"
                >
                  {i > 0 && <ChevronRight className="size-3.5 shrink-0 opacity-60" />}
                  <Link
                    {...c.link}
                    activeOptions={{ exact: true }}
                    className="block max-w-[11rem] truncate rounded-md px-1.5 py-1 transition-colors hover:bg-groove/60 hover:text-ink"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
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
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {below && <div className="mt-4 sm:hidden">{below}</div>}
    </header>
  );
}

// Две колонки на широком экране; на телефоне и планшете - одна под другой.
export function Columns({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <div className="min-w-0">{main}</div>
      <aside className="min-w-0">{side}</aside>
    </div>
  );
}

// Секция: тихая подпись сверху (как в "Настройках" iOS и панели свойств Linear) и содержимое.
export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {(title || action) && (
        <div className="mb-2 flex min-h-8 items-center justify-between gap-3 px-1">
          {title && <h2 className="text-sm font-medium text-dim">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// Действие в строке заголовка секции, справа: тихая кнопка со значком ("Добавить промо-план",
// "Добавить этапы из шаблона"). Отступы слева и справа одинаковые, правый край - по краю списка.
export function SectionButton({
  icon,
  children,
  className,
  ...props
}: ComponentProps<typeof Button> & { icon: ReactNode }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        '-mr-1 h-8 gap-1.5 px-2 text-sm font-normal text-dim hover:text-ink [&_svg]:size-4',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </Button>
  );
}

// Сгруппированный список: одна подложка, строки через тонкие разделители.
export const GROUP =
  'overflow-hidden rounded-xl bg-panel ring-1 ring-border/70 dark:ring-border/40';
export const GROUP_ROWS = cn(GROUP, 'divide-y divide-border/70 dark:divide-border/50');
// строка группы: на телефоне - зона нажатия не меньше 44px
export const ROW = 'flex min-h-12 items-center gap-3 px-4';

export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className={cn(GROUP, 'flex flex-col items-center gap-3 px-6 py-10 text-center')}>
      <p className="text-dim">{children}</p>
      {action}
    </div>
  );
}
