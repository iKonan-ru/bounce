import type { ReactNode } from 'react';
import { getLinkMeta, ServiceIcon, getProjectLinks } from '@/entities/service';
import { getSafeUrl, cn } from '@/shared/utils';
import type {
  LinkChipProps,
  ProjectLinksBarProps,
} from '../types/project-links';

/** Плашка ссылки: знак и название, при наведении знак становится фирменного цвета */
function LinkChip({ link }: LinkChipProps): ReactNode {
  const meta = getLinkMeta(link);

  if (!meta) {
    return null;
  }

  const href = getSafeUrl(link.url) ?? undefined;

  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="group/brand flex h-10 items-center gap-2 rounded-full bg-panel px-3.5 text-sm text-dim ring-1 ring-border/70 transition-colors hover:text-ink md:h-9 dark:bg-white/5 dark:ring-border/40"
      >
        <ServiceIcon
          service={meta.service}
          shouldBrandOnHover
          className="size-[1.125rem]"
        />
        {meta.label}
      </a>
    </li>
  );
}

/** Ссылки внизу страницы проекта: плашки со знаком и названием */
export function ProjectLinksBar({
  project,
  className,
}: ProjectLinksBarProps): ReactNode {
  const links = getProjectLinks(project);

  if (links.length === 0) {
    return null;
  }

  const listClassName = cn('flex flex-wrap gap-2', className);

  return (
    <ul aria-label="Ссылки" className={listClassName}>
      {links.map((link, index) => (
        // ключ - позиция: у "другого" может совпасть и сервис, и адрес
        <LinkChip key={`${link.service}-${index}`} link={link} />
      ))}
    </ul>
  );
}
