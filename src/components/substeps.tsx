import { X } from 'lucide-react';
import { AddRow } from '@/components/add-inline';
import { InlineTitle } from '@/components/inline-title';
import { MentionText } from '@/components/mentions';
import { GROUP_ROWS } from '@/components/page';
import { SortableList } from '@/components/sortable';
import { Checkbox } from '@/components/ui/checkbox';
import { newRecordId } from '@/lib/id';
import { arrayMoveById } from '@/lib/stages';
import { cn } from '@/lib/utils';

type Item = { id: string; title: string; done?: boolean };

// Подэтапы - чек-лист: отметка "сделано" (у этапа песни), переименование по нажатию на текст,
// перетаскивание, удаление, добавление.
// Ручка и крестик на компьютере видны при наведении, на телефоне - всегда, но тихие.
export function SubstepsEditor<T extends Item>({
  idPrefix,
  items,
  onChange,
  checkable,
  readOnly,
  projectId,
}: {
  // проект - для упоминаний людей через @
  projectId?: string | undefined;
  idPrefix: string;
  items: ReadonlyArray<T>;
  onChange: (items: Item[]) => void;
  checkable: boolean;
  // только показать: без отметок, перетаскивания и правки
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <ul className={GROUP_ROWS}>
        {items.map((s) => (
          <li key={s.id} className="flex min-h-12 items-center gap-3 px-4 md:min-h-10">
            {checkable && (
              <Checkbox
                disabled
                aria-label={s.title}
                className="size-5 rounded-full disabled:opacity-100 md:size-[1.125rem]"
                checked={s.done === true}
              />
            )}
            <span className={cn('min-w-0 text-pretty', s.done && 'text-dim line-through')}>
              <MentionText text={s.title} />
            </span>
          </li>
        ))}
        {items.length === 0 && <li className="px-4 py-3 text-sm text-dim">Подэтапов нет</li>}
      </ul>
    );
  }
  const hoverOnly =
    '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/sub:opacity-100 focus-visible:opacity-100';
  return (
    <div className={GROUP_ROWS}>
      {items.length > 0 && (
        <SortableList
          items={items}
          onReorder={(from, to) => onChange(arrayMoveById(items, from, to))}
          className="divide-y divide-border/70 dark:divide-border/50"
          handleClassName={cn('h-10 w-6', hoverOnly)}
        >
          {(s, handle) => {
            const cid = `${idPrefix}-${s.id}`;
            const rename = (title: string) =>
              onChange(items.map((x) => (x.id === s.id ? { ...x, title } : x)));
            return (
              <div className="group/sub flex min-h-12 items-center gap-1 pr-2 pl-1 md:min-h-10">
                {handle}
                {checkable && (
                  <label
                    htmlFor={cid}
                    className="-ml-1 flex size-10 shrink-0 cursor-pointer items-center justify-center md:size-8"
                  >
                    <Checkbox
                      id={cid}
                      aria-label={s.title}
                      className="size-5 rounded-full md:size-[1.125rem]"
                      checked={s.done === true}
                      onCheckedChange={(v) =>
                        onChange(items.map((x) => (x.id === s.id ? { ...x, done: v === true } : x)))
                      }
                    />
                  </label>
                )}
                <div
                  className={cn(
                    'min-w-0 flex-1 py-1 transition-colors',
                    !checkable && 'pl-1',
                    s.done && 'text-dim line-through',
                  )}
                >
                  <InlineTitle
                    value={s.title}
                    label={`Переименовать "${s.title}"`}
                    maxLength={200}
                    pencil={false}
                    mentionProject={projectId}
                    onSave={rename}
                  />
                </div>
                <button
                  type="button"
                  aria-label={`Удалить "${s.title}"`}
                  onClick={() => onChange(items.filter((x) => x.id !== s.id))}
                  className={cn(
                    'group/x flex size-9 shrink-0 items-center justify-center text-dim/70 transition-opacity',
                    hoverOnly,
                  )}
                >
                  <span className="flex size-6 items-center justify-center rounded-md transition-colors group-hover/x:bg-groove group-hover/x:text-ink">
                    <X className="size-4" />
                  </span>
                </button>
              </div>
            );
          }}
        </SortableList>
      )}
      <AddRow
        id={`${idPrefix}-new`}
        mentionProject={projectId}
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
