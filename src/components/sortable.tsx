import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
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
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props<T extends { id: string }> = {
  items: ReadonlyArray<T>;
  onReorder: (from: string, to: string) => void;
  children: (item: T, handle: ReactNode, index: number) => ReactNode;
  className?: string;
  disabled?: boolean;
  // вид ручки: по умолчанию - кнопка 40px
  handleClassName?: string;
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
}: Props<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function end(e: DragEndEvent) {
    const over = e.over?.id;
    if (over !== undefined && over !== e.active.id) onReorder(String(e.active.id), String(over));
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={end}
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
  children,
}: {
  id: string;
  disabled: boolean | undefined;
  handleClassName: string | undefined;
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
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'relative',
        isDragging && 'z-10 rounded-xl bg-panel shadow-lg ring-1 ring-border',
      )}
    >
      {children(handle)}
    </li>
  );
}
