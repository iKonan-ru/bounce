import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Announcements, UniqueIdentifier } from '@dnd-kit/core';
import { DragOverlay, DndContext, closestCenter } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  WHOLE_PRESS_DELAY_MS,
  SCREEN_READER_INSTRUCTIONS,
  VERTICAL_MODIFIERS,
  DROP_ANIMATION,
  DRAG_OVERLAY_Z_INDEX,
  HANDLE_CLASS_NAME,
  DEFAULT_HANDLE_SIZE_CLASS_NAME,
} from '../constants/sortable';
import { useSortableList } from '../hooks/use-sortable-list';
import type {
  Identified,
  SortableListProps,
  ActiveItemCopyProps,
  HandleLookProps,
} from '../types/sortable';
import { cn } from '../utils/cn';
import { HandleIcon } from './handle-icon';
import { SortableItem } from './sortable-item';

/**
 * Объявления для экранного диктора по-русски (у dnd-kit они английские)
 *
 * Элементы называются по месту в списке: id записей человеку ничего не скажут
 */
function getAnnouncements(ids: string[]): Announcements {
  const getPlace = (id: UniqueIdentifier): number =>
    ids.indexOf(String(id)) + 1;

  return {
    onDragStart: ({ active }) =>
      `Взят элемент ${getPlace(active.id)} из ${ids.length}.`,
    onDragOver: ({ active, over }) => {
      if (!over) {
        return undefined;
      }

      return `Элемент ${getPlace(active.id)} над местом ${getPlace(over.id)}.`;
    },
    onDragEnd: ({ active, over }) => {
      if (!over) {
        return `Элемент ${getPlace(active.id)} оставлен на месте.`;
      }

      return `Элемент ${getPlace(active.id)} поставлен на место ${getPlace(over.id)}.`;
    },
    onDragCancel: ({ active }) =>
      `Перестановка отменена, элемент ${getPlace(active.id)} на прежнем месте.`,
  };
}

/**
 * Список, который переставляют перетаскиванием за ручку
 *
 * На телефоне ручка - отдельная зона, чтобы список по-прежнему прокручивался пальцем
 */
export function SortableList<T extends Identified>({
  items,
  onReorder,
  children,
  className,
  disabled,
  handleClassName,
  isWhole = false,
  pressDelay = WHOLE_PRESS_DELAY_MS,
}: SortableListProps<T>): ReactNode {
  const {
    shownItems,
    itemIds,
    sensors,
    activeItem,
    activeIndex,
    onDragStart,
    onDragEnd,
    onDragCancel,
  } = useSortableList({ items, onReorder, isWhole: isWhole, pressDelay });

  const accessibility = {
    screenReaderInstructions: SCREEN_READER_INSTRUCTIONS,
    announcements: getAnnouncements(itemIds),
  };
  const isSortingDisabled = disabled ?? false;
  const handleLook = <HandleLook className={handleClassName} />;
  const overlayHandle = isWhole ? null : handleLook;
  const overlay = createPortal(
    <DragOverlay
      modifiers={VERTICAL_MODIFIERS}
      dropAnimation={DROP_ANIMATION}
      zIndex={DRAG_OVERLAY_Z_INDEX}
    >
      {activeItem && (
        <ActiveItemCopy
          item={activeItem}
          index={activeIndex}
          handle={overlayHandle}
          renderItem={children}
        />
      )}
    </DragOverlay>,
    document.body
  );

  return (
    <DndContext
      sensors={sensors}
      accessibility={accessibility}
      collisionDetection={closestCenter}
      modifiers={VERTICAL_MODIFIERS}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <SortableContext
        items={itemIds}
        strategy={verticalListSortingStrategy}
        disabled={isSortingDisabled}
      >
        <ul className={className}>
          {shownItems.map((item, index) => (
            <SortableItem
              key={item.id}
              item={item}
              index={index}
              disabled={disabled}
              handleClassName={handleClassName}
              isWhole={isWhole}
              renderItem={children}
            />
          ))}
        </ul>
      </SortableContext>
      {overlay}
    </DndContext>
  );
}

/** Схваченная копия элемента поверх страницы */
function ActiveItemCopy<T extends Identified>({
  item,
  index,
  handle,
  renderItem,
}: ActiveItemCopyProps<T>): ReactNode {
  const content = renderItem(item, handle, index);

  return (
    <div className="animate-lift overflow-hidden rounded-xl bg-panel shadow-xl ring-1 ring-border/80 dark:ring-border/60">
      {content}
    </div>
  );
}

/** Ручка в схваченной копии: только вид */
function HandleLook({ className }: HandleLookProps): ReactNode {
  const handleLookClassName = cn(
    HANDLE_CLASS_NAME,
    'cursor-grabbing',
    className ?? DEFAULT_HANDLE_SIZE_CLASS_NAME
  );

  return (
    <span aria-hidden="true" className={handleLookClassName}>
      <HandleIcon />
    </span>
  );
}
