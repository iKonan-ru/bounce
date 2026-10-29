import { Link, type LinkProps } from '@tanstack/react-router';
import { ChevronRight, Pencil } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
interface PageHeaderProps {
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

/** Крошка активна только на своей странице, а не на вложенных */
const EXACT_ACTIVE_OPTIONS = { exact: true } as const;

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
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {below && <div className="mt-4 sm:hidden">{below}</div>}
    </header>
  );
}

/** Пропсы хлебной крошки */
interface CrumbItemProps {
  crumb: Crumb;
  /** Место в пути: перед всеми, кроме первой, - стрелка */
  index: number;
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

/** Пропсы двух колонок */
interface ColumnsProps {
  main: ReactNode;
  /** Боковая колонка: на узком экране - под основной */
  side: ReactNode;
}

/** Две колонки на широком экране; на телефоне и планшете - одна под другой */
export function Columns({ main, side }: ColumnsProps): ReactNode {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <div className="min-w-0">{main}</div>
      <aside className="min-w-0">{side}</aside>
    </div>
  );
}

/** Пропсы секции */
interface SectionProps {
  title?: ReactNode;
  /** Действие справа в строке заголовка */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Секция: тихая подпись сверху (как в "Настройках" iOS и панели свойств Linear) и содержимое */
export function Section({ title, action, children, className }: SectionProps): ReactNode {
  const hasHeading = Boolean(title) || Boolean(action);
  return (
    <section className={className}>
      {hasHeading && (
        <div className="mb-2 flex min-h-8 items-center justify-between gap-3 px-1">
          {title && <h2 className="text-sm font-medium text-dim">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Пропсы кнопки в строке заголовка секции */
interface SectionButtonProps extends ComponentProps<typeof Button> {
  icon: ReactNode;
}

/**
 * Действие в строке заголовка секции, справа: тихая кнопка со значком ("Добавить промо-план",
 * "Добавить этапы из шаблона")
 *
 * Отступы слева и справа одинаковые, правый край - по краю списка
 */
export function SectionButton({
  icon,
  children,
  className,
  ...props
}: SectionButtonProps): ReactNode {
  const buttonClassName = cn(
    '-mr-1 h-8 gap-1.5 px-2 text-sm font-normal text-dim hover:text-ink [&_svg]:size-4',
    className,
  );
  return (
    <Button variant="ghost" size="sm" className={buttonClassName} {...props}>
      {icon}
      {children}
    </Button>
  );
}

/** Сгруппированный список: одна подложка */
export const GROUP =
  'overflow-hidden rounded-xl bg-panel ring-1 ring-border/70 dark:ring-border/40';

/** Сгруппированный список: одна подложка, строки через тонкие разделители */
export const GROUP_ROWS = cn(GROUP, 'divide-y divide-border/70 dark:divide-border/50');

/** Пропсы пустого состояния */
interface EmptyStateProps {
  /** Пояснение, почему пусто */
  children: ReactNode;
  /** Кнопка первого действия */
  action?: ReactNode;
}

/** Пустой список: пояснение и, если есть, первое действие */
export function EmptyState({ children, action }: EmptyStateProps): ReactNode {
  const emptyClassName = cn(GROUP, 'flex flex-col items-center gap-3 px-6 py-10 text-center');
  return (
    <div className={emptyClassName}>
      <p className="text-dim">{children}</p>
      {action}
    </div>
  );
}
