import { ChevronDown } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Collapse } from '@/components/collapse';
import { GROUP_ROWS, Section } from '@/components/page';
import { BUCKET_LABEL, type Bucket } from '@/lib/plan';
import { cn } from '@/lib/utils';

// Пункты по срокам (план, контент-план): секция на каждую группу - название (просроченное
// красным) и число, - а сделанное свёрнуто внизу ("Выполнено", "Опубликовано").
export function BucketedSections<T extends { id: string }, D extends { id: string }>({
  groups,
  noneLabel = BUCKET_LABEL.none,
  renderItem,
  done,
  doneLabel,
  renderDone,
}: {
  groups: ReadonlyArray<{ bucket: Bucket; items: ReadonlyArray<T> }>;
  // название группы без срока
  noneLabel?: string;
  renderItem: (item: T, bucket: Bucket) => ReactNode;
  done: ReadonlyArray<D>;
  doneLabel: string;
  renderDone: (item: D) => ReactNode;
}) {
  const [showDone, setShowDone] = useState(false);
  return (
    <>
      {groups.map((g) => (
        <Section
          key={g.bucket}
          title={
            <span className={cn(g.bucket === 'overdue' && 'text-led-red')}>
              {g.bucket === 'none' ? noneLabel : BUCKET_LABEL[g.bucket]}
            </span>
          }
          action={<span className="text-sm text-dim tabular-nums">{g.items.length}</span>}
        >
          <ul className={GROUP_ROWS}>
            {g.items.map((item) => (
              <li key={item.id} className="animate-enter">
                {renderItem(item, g.bucket)}
              </li>
            ))}
          </ul>
        </Section>
      ))}
      {done.length > 0 && (
        <section>
          <button
            type="button"
            aria-expanded={showDone}
            onClick={() => setShowDone(!showDone)}
            className="mb-2 flex min-h-8 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-dim transition-colors hover:text-ink"
          >
            {doneLabel}
            <span className="tabular-nums">{done.length}</span>
            <ChevronDown
              className={cn('size-4 transition-transform duration-200', showDone && 'rotate-180')}
            />
          </button>
          <Collapse open={showDone}>
            <ul className={GROUP_ROWS}>
              {done.map((item) => (
                <li key={item.id}>{renderDone(item)}</li>
              ))}
            </ul>
          </Collapse>
        </section>
      )}
    </>
  );
}
