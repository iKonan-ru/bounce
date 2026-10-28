import { Trash2 } from 'lucide-react';
import { AddInline } from '@/components/add-inline';
import { SortableList } from '@/components/sortable';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { newRecordId } from '@/lib/id';
import { arrayMoveById } from '@/lib/stages';
import { cn } from '@/lib/utils';

type Item = { id: string; title: string; done?: boolean };

// Подэтапы: перетаскивание, удаление, добавление; у этапа песни ещё и отметка "сделано".
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
  return (
    <div className="flex flex-col gap-2">
      {items.length > 0 && (
        <SortableList
          items={items}
          onReorder={(from, to) => onChange(arrayMoveById(items, from, to))}
          className="flex flex-col"
        >
          {(s, handle) => {
            const cid = `${idPrefix}-${s.id}`;
            return (
              <div className="flex min-h-12 items-center gap-1">
                {handle}
                {checkable ? (
                  <label
                    htmlFor={cid}
                    className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3"
                  >
                    <Checkbox
                      id={cid}
                      className="size-5"
                      checked={s.done === true}
                      onCheckedChange={(v) =>
                        onChange(items.map((x) => (x.id === s.id ? { ...x, done: v === true } : x)))
                      }
                    />
                    <span className={cn('min-w-0 text-pretty', s.done && 'text-dim line-through')}>
                      {s.title}
                    </span>
                  </label>
                ) : (
                  <span className="min-w-0 flex-1 text-pretty">{s.title}</span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Удалить "${s.title}"`}
                  className="text-dim"
                  onClick={() => onChange(items.filter((x) => x.id !== s.id))}
                >
                  <Trash2 />
                </Button>
              </div>
            );
          }}
        </SortableList>
      )}
      <AddInline
        id={`${idPrefix}-new`}
        placeholder="Новый подэтап"
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
