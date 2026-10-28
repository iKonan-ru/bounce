import {
  closestCenter,
  DndContext,
  type DragEndEvent,
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
import { type KeyboardEvent, type ReactNode, useEffect, useRef } from 'react';
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
};

// Список, который переставляют перетаскиванием за ручку. На телефоне ручка - отдельная зона,
// чтобы список по-прежнему прокручивался пальцем.
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  children,
  className,
  disabled,
  handleClassName,
  whole = false,
}: Props<T>) {
  // за весь элемент: PointerSensor перехватил бы прокрутку пальцем, поэтому мышь отдельно
  const sensors = useSensors(
    useSensor(whole ? MouseSensor : PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: whole ? { delay: 300, tolerance: 6 } : { delay: 120, tolerance: 8 },
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
  function end(e: DragEndEvent) {
    dragging.current = false;
    endedAt.current = Date.now();
    const over = e.over?.id;
    if (over !== undefined && over !== e.active.id) onReorder(String(e.active.id), String(over));
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={() => {
        dragging.current = true;
        navigator.vibrate?.(10);
      }}
      onDragEnd={end}
      onDragCancel={() => {
        dragging.current = false;
        endedAt.current = Date.now();
      }}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
        disabled={disabled ?? false}
      >
        <ul className={className}>
          {items.map((item, i) => (
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
      className={cn(
        'flex shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-dim transition-opacity hover:bg-groove active:cursor-grabbing disabled:opacity-30',
        handleClassName ?? 'size-10',
      )}
      disabled={disabled}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
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
        isDragging && 'z-10 rounded-xl bg-panel shadow-lg ring-1 ring-border',
      )}
      {...(whole ? { ...attributes, ...listeners, onKeyDown } : {})}
    >
      {children(whole ? null : handle)}
    </li>
  );
}
