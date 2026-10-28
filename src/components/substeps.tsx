import { X } from 'lucide-react';
import { AddRow } from '@/components/add-inline';
import { GROUP_ROWS } from '@/components/page';
import { SortableList } from '@/components/sortable';
import { Checkbox } from '@/components/ui/checkbox';
import { newRecordId } from '@/lib/id';
import { arrayMoveById } from '@/lib/stages';
import { cn } from '@/lib/utils';

type Item = { id: string; title: string; done?: boolean };

// Подэтапы - чек-лист: отметка "сделано" (у этапа песни), перетаскивание, удаление, добавление.
// Ручка и крестик на компьютере видны при наведении, на телефоне - всегда, но тихие.
export function SubstepsEditor<T extends Item>({
  idPrefix,
  items,
  onChange,
  checkable,
}: {
  idPrefix: string;
  items: ReadonlyArray<T>;
  onChange: (items: Item[]) => void;
  checkable: boolean;
}) {
  const hoverOnly =
    '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/sub:opacity-100';
  return (
    <div className={GROUP_ROWS}>
      {items.length > 0 && (
        <SortableList
          items={items}
          onReorder={(from, to) => onChange(arrayMoveById(items, from, to))}
          className="divide-y divide-border/70 dark:divide-border/50"
          handleClassName={cn('h-10 w-7', hoverOnly)}
        >
          {(s, handle) => {
            const cid = `${idPrefix}-${s.id}`;
            return (
              <div className="group/sub flex min-h-12 items-center gap-1 pr-2 pl-1 md:min-h-10">
                {handle}
                {checkable ? (
                  <label
                    htmlFor={cid}
                    className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 md:min-h-9"
                  >
                    <Checkbox
                      id={cid}
                      className="size-5 rounded-full md:size-[1.125rem]"
                      checked={s.done === true}
                      onCheckedChange={(v) =>
                        onChange(items.map((x) => (x.id === s.id ? { ...x, done: v === true } : x)))
                      }
                    />
                    <span
                      className={cn(
                        'min-w-0 text-pretty transition-colors',
                        s.done && 'text-dim line-through',
                      )}
                    >
                      {s.title}
                    </span>
                  </label>
                ) : (
                  <span className="min-w-0 flex-1 pl-1 text-pretty">{s.title}</span>
                )}
                <button
                  type="button"
                  aria-label={`Удалить "${s.title}"`}
                  onClick={() => onChange(items.filter((x) => x.id !== s.id))}
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-md text-dim/70 transition-opacity hover:bg-groove hover:text-ink',
                    hoverOnly,
                  )}
                >
                  <X className="size-4" />
                </button>
              </div>
            );
          }}
        </SortableList>
      )}
      <AddRow
        id={`${idPrefix}-new`}
        label="Добавить подэтап"
        onAdd={(title) =>
          onChange([
            ...items,
            checkable ? { id: newRecordId(), title, done: false } : { id: newRecordId(), title },
          ])
        }
      />
    </div>
  );
}
