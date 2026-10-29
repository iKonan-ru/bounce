import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DropAnimation,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { arrayMoveById } from '@/lib/stages';
import { cn } from '@/lib/utils';

type Props<T extends { id: string }> = {
  items: ReadonlyArray<T>;
  onReorder: (from: string, to: string) => void;
  children: (item: T, handle: ReactNode, index: number) => ReactNode;
  className?: string;
  disabled?: boolean;
  // вид ручки: по умолчанию - кнопка 40px
  handleClassName?: string;
  // перетаскивать за весь элемент, без ручки: мышью - потянуть, пальцем - нажать и подержать
  whole?: boolean;
  // сколько держать палец до начала перетаскивания (для whole), мс
  pressDelay?: number;
};

// Подсказка и объявления для экранного диктора по-русски (у dnd-kit они английские). Элементы
// называются по месту в списке: id записей человеку ничего не скажут.
const INSTRUCTIONS = {
  draggable:
    'Чтобы переставить, нажмите пробел или Enter, двигайте стрелками вверх и вниз, ' +
    'ещё раз пробел или Enter - поставить, Escape - отменить.',
};

function announcements(ids: string[]): Announcements {
  const place = (id: string | number) => ids.indexOf(String(id)) + 1;
  return {
    onDragStart: ({ active }) => `Взят элемент ${place(active.id)} из ${ids.length}.`,
    onDragOver: ({ active, over }) =>
      over ? `Элемент ${place(active.id)} над местом ${place(over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Элемент ${place(active.id)} поставлен на место ${place(over.id)}.`
        : `Элемент ${place(active.id)} оставлен на месте.`,
    onDragCancel: ({ active }) =>
      `Перестановка отменена, элемент ${place(active.id)} на прежнем месте.`,
  };
}

// схваченный элемент опускается на место коротко и мягко
const DROP: DropAnimation = { duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' };

// Список, который переставляют перетаскиванием за ручку. На телефоне ручка - отдельная зона,
// чтобы список по-прежнему прокручивался пальцем.
// Местный порядок после перетаскивания ждёт новый список снаружи не дольше этого: если он не
// пришёл (правку отклонили), снова виден порядок снаружи.
const LOCAL_ORDER_MS = 4000;

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  children,
  className,
  disabled,
  handleClassName,
  whole = false,
  pressDelay = 300,
}: Props<T>) {
  // Новый порядок показывается сразу, в том же кадре, что и конец перетаскивания: иначе
  // опускание успевает отрисоваться по старому порядку (кэш запросов обновляется на такт позже)
  // и элемент сначала уезжает на старое место. Местный порядок живёт, пока список снаружи
  // не придёт новым.
  const key = items.map((i) => i.id).join(',');
  const [local, setLocal] = useState<{ base: string; ids: string[] } | null>(null);
  const order = local && local.base === key ? local.ids : null;
  const list = order ? order.flatMap((id) => items.find((i) => i.id === id) ?? []) : [...items];
  useEffect(() => {
    if (!local) return;
    const t = setTimeout(() => setLocal(null), LOCAL_ORDER_MS);
    return () => clearTimeout(t);
  }, [local]);
  // за весь элемент: PointerSensor перехватил бы прокрутку пальцем, поэтому мышь отдельно
  const sensors = useSensors(
    useSensor(whole ? MouseSensor : PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: whole
        ? { delay: pressDelay, tolerance: 6 }
        : { delay: 120, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  // После перетаскивания отпускание не должно сработать как нажатие на ссылку внутри. dnd-kit
  // сам только останавливает всплытие этого нажатия, а переход по ссылке браузер всё равно
  // делает - поэтому отмена здесь, на window до его обработчика.
  const endedAt = useRef(0);
  const dragging = useRef(false);
  useEffect(() => {
    if (!whole) return;
    const cancel = (e: MouseEvent) => {
      if (dragging.current || Date.now() - endedAt.current < 400) e.preventDefault();
    };
    window.addEventListener('click', cancel, true);
    return () => window.removeEventListener('click', cancel, true);
  }, [whole]);
  // схваченный элемент рисуется поверх страницы (в портале), а на его месте - бледная копия:
  // блоки списков обрезают содержимое по скруглённым краям
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIndex = activeId === null ? -1 : list.findIndex((i) => i.id === activeId);
  const active = activeIndex >= 0 ? list[activeIndex] : undefined;
  function end(e: DragEndEvent) {
    setActiveId(null);
    dragging.current = false;
    endedAt.current = Date.now();
    const over = e.over?.id;
    if (over === undefined || over === e.active.id) return;
    const from = String(e.active.id);
    const to = String(over);
    setLocal({ base: key, ids: arrayMoveById(list, from, to).map((i) => i.id) });
    onReorder(from, to);
  }
  return (
    <DndContext
      sensors={sensors}
      accessibility={{
        screenReaderInstructions: INSTRUCTIONS,
        announcements: announcements(list.map((i) => i.id)),
      }}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={(e) => {
        dragging.current = true;
        setActiveId(String(e.active.id));
        navigator.vibrate?.(10);
      }}
      onDragEnd={end}
      onDragCancel={() => {
        setActiveId(null);
        dragging.current = false;
        endedAt.current = Date.now();
      }}
    >
      <SortableContext
        items={list.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
        disabled={disabled ?? false}
      >
        <ul className={className}>
          {list.map((item, i) => (
            <SortableItem
              key={item.id}
              id={item.id}
              disabled={disabled}
              handleClassName={handleClassName}
              whole={whole}
            >
              {(handle) => children(item, handle, i)}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
      {createPortal(
        <DragOverlay modifiers={[restrictToVerticalAxis]} dropAnimation={DROP} zIndex={60}>
          {active && (
            <div className="animate-lift overflow-hidden rounded-xl bg-panel shadow-xl ring-1 ring-border/80 dark:ring-border/60">
              {children(
                active,
                whole ? null : <HandleLook className={handleClassName} />,
                activeIndex,
              )}
            </div>
          )}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}

function SortableItem({
  id,
  disabled,
  handleClassName,
  whole,
  children,
}: {
  id: string;
  disabled: boolean | undefined;
  handleClassName: string | undefined;
  whole: boolean;
  children: (handle: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: disabled ?? false,
  });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label="Перетащить"
      className={cn(HANDLE, handleClassName ?? 'size-10')}
      disabled={disabled}
      {...attributes}
      {...listeners}
    >
      <HandleIcon />
    </button>
  );
  // клавиатура: Пробел и Enter на самой строке - перетаскивание, на ссылке внутри - переход
  const onKeyDown = (e: KeyboardEvent<HTMLLIElement>) => {
    if (e.target === e.currentTarget) listeners?.['onKeyDown']?.(e);
  };
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'relative',
        whole && 'select-none [-webkit-touch-callout:none]',
        isDragging && 'opacity-35',
      )}
      {...(whole ? { ...attributes, ...listeners, onKeyDown } : {})}
    >
      {children(whole ? null : handle)}
    </li>
  );
}

// Зона нажатия ручки - вся её высота, а подсветка при наведении - только вокруг значка.
const HANDLE =
  'group/handle flex shrink-0 cursor-grab touch-none items-center justify-center text-dim transition-opacity active:cursor-grabbing disabled:opacity-30';

function HandleIcon() {
  return (
    <span className="flex h-7 w-5 items-center justify-center rounded-md transition-colors group-hover/handle:bg-groove group-hover/handle:text-ink">
      <GripVertical className="size-4" />
    </span>
  );
}

// ручка в схваченной копии: только вид
function HandleLook({ className }: { className: string | undefined }) {
  return (
    <span aria-hidden="true" className={cn(HANDLE, 'cursor-grabbing', className ?? 'size-10')}>
      <HandleIcon />
    </span>
  );
}
