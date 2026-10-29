import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { getLinkMeta, ServiceIcon } from '@/entities/service';
import { Button } from '@/shared/ui';
import { cn, getSafeUrl } from '@/shared/utils';
import { LINK_ROW_CLASS_NAME } from '../constants/project-links';
import type { LinkRowProps } from '../types/project-links';

/** Строка ссылки в настройках: знак, название (по нажатию - правка) и переход */
export function LinkRow({
  link,
  handle,
  isEditable,
  onEdit,
}: LinkRowProps): ReactNode {
  const meta = getLinkMeta(link);

  if (!meta) {
    return null;
  }

  const rowClassName = cn(LINK_ROW_CLASS_NAME, {
    'group/row pl-1 hover:bg-groove/30': isEditable,
  });
  const editLabel = `Изменить ссылку: ${meta.label}`;
  const openLabel = `Открыть: ${meta.label}`;
  const href = getSafeUrl(link.url) ?? undefined;
  const onEditClick = (): void => {
    onEdit(link);
  };

  return (
    <div className={rowClassName}>
      {handle}
      <ServiceIcon service={meta.service} className="text-dim" />
      {isEditable ? (
        <button
          type="button"
          onClick={onEditClick}
          className="flex min-h-12 min-w-0 flex-1 items-center text-left md:min-h-11"
          aria-label={editLabel}
        >
          <span className="truncate">{meta.label}</span>
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate">{meta.label}</span>
      )}
      {/* подсвечивается только знаком: подложка - одна на всю строку, как у этапов */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="-mr-2 text-dim hover:bg-transparent hover:text-ink dark:hover:bg-transparent"
        asChild
      >
        <a href={href} target="_blank" rel="noreferrer" aria-label={openLabel}>
          <ExternalLink />
        </a>
      </Button>
    </div>
  );
}
