import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { BUCKET_LABEL } from '../constants/buckets';
import { GROUP_ROWS } from '../constants/page';
import type {
  ListItem,
  BucketedSectionsProps,
  BucketSectionProps,
} from '../types/bucketed-sections';
import { Bucket } from '../types/buckets';
import { cn } from '../utils/cn';
import { Collapse } from './collapse';
import { Section } from './section';

/**
 * Пункты по срокам (план, контент-план): секция на каждую группу - название (просроченное
 * красным) и число, - а сделанное свёрнуто внизу ("Выполнено", "Опубликовано")
 */
export function BucketedSections<
  Item extends ListItem,
  DoneItem extends ListItem,
>({
  groups,
  noneLabel = BUCKET_LABEL[Bucket.None],
  renderItem,
  done,
  doneLabel,
  renderDone,
}: BucketedSectionsProps<Item, DoneItem>): ReactNode {
  const [showDone, setShowDone] = useState(false);
  const hasDone = done.length > 0;
  const onDoneToggleClick = (): void => {
    setShowDone(!showDone);
  };
  const chevronClassName = cn('size-4 transition-transform duration-200', {
    'rotate-180': showDone,
  });

  return (
    <>
      {groups.map((group) => (
        <BucketSection
          key={group.bucket}
          group={group}
          noneLabel={noneLabel}
          renderItem={renderItem}
        />
      ))}
      {hasDone && (
        <section>
          <button
            type="button"
            aria-expanded={showDone}
            onClick={onDoneToggleClick}
            className="mb-2 flex min-h-8 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-dim transition-colors hover:text-ink"
          >
            {doneLabel}
            <span className="tabular-nums">{done.length}</span>
            <ChevronDown className={chevronClassName} />
          </button>
          <Collapse isOpen={showDone}>
            <ul className={GROUP_ROWS}>
              {done.map((item) => {
                const content = renderDone(item);

                return <li key={item.id}>{content}</li>;
              })}
            </ul>
          </Collapse>
        </section>
      )}
    </>
  );
}

/** Секция группы сроков: название, число пунктов и сами пункты */
function BucketSection<Item extends ListItem>({
  group,
  noneLabel,
  renderItem,
}: BucketSectionProps<Item>): ReactNode {
  const isOverdue = group.bucket === Bucket.Overdue;
  const isNone = group.bucket === Bucket.None;
  const label = isNone ? noneLabel : BUCKET_LABEL[group.bucket];
  const labelClassName = cn({ 'text-led-red': isOverdue });
  const title = <span className={labelClassName}>{label}</span>;
  const count = (
    <span className="text-sm text-dim tabular-nums">{group.items.length}</span>
  );

  return (
    <Section title={title} action={count}>
      <ul className={GROUP_ROWS}>
        {group.items.map((item) => {
          const content = renderItem(item, group.bucket);

          return (
            <li key={item.id} className="animate-enter">
              {content}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
