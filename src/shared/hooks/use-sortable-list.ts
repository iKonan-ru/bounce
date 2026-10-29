import { useState, useEffect, useRef } from 'react';
import type {
  PointerActivationConstraint,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  MouseSensor,
  PointerSensor,
  useSensors,
  useSensor,
  TouchSensor,
  KeyboardSensor,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  NOT_FOUND_INDEX,
  ORDER_KEY_SEPARATOR,
  LOCAL_ORDER_MS,
  WHOLE_PRESS_TOLERANCE_PX,
  HANDLE_TOUCH_CONSTRAINT,
  MOUSE_DRAG_DISTANCE_PX,
  CLICK_AFTER_DROP_MS,
  PICK_VIBRATION_MS,
} from '../constants/sortable';
import type {
  Identified,
  UseSortableListParams,
  UseSortableListResult,
  LocalOrder,
} from '../types/sortable';
import { moveItemById } from '../utils/order';

/** Элементы в местном порядке, если он есть, иначе - как пришли снаружи */
function getShownItems<T extends Identified>(
  items: readonly T[],
  order: string[] | null
): T[] {
  if (!order) {
    return [...items];
  }

  return order.flatMap((id) => {
    const item = items.find((candidate) => candidate.id === id);

    if (!item) {
      return [];
    }

    return [item];
  });
}

/** Место элемента в списке; без элемента - не найдено */
function getItemIndex<T extends Identified>(
  items: readonly T[],
  id: string | null
): number {
  if (id === null) {
    return NOT_FOUND_INDEX;
  }

  return items.findIndex((item) => item.id === id);
}

/** Порядок, перетаскивание и датчики списка */
export function useSortableList<T extends Identified>({
  items,
  onReorder,
  isWhole,
  pressDelay,
}: UseSortableListParams<T>): UseSortableListResult<T> {
  // Новый порядок показывается сразу, в том же кадре, что и конец перетаскивания: иначе
  // опускание успевает отрисоваться по старому порядку (кэш запросов обновляется на такт позже)
  // и элемент сначала уезжает на старое место. Местный порядок живёт, пока список снаружи
  // не придёт новым.
  const orderKey = items.map((item) => item.id).join(ORDER_KEY_SEPARATOR);
  const [localOrder, setLocalOrder] = useState<LocalOrder | null>(null);
  const isLocalOrderCurrent =
    localOrder !== null && localOrder.base === orderKey;
  const order = isLocalOrderCurrent ? localOrder.ids : null;
  const shownItems = getShownItems(items, order);
  const itemIds = shownItems.map((item) => item.id);
  useEffect(() => {
    if (!localOrder) {
      return;
    }

    const timer = setTimeout(() => setLocalOrder(null), LOCAL_ORDER_MS);

    return () => clearTimeout(timer);
  }, [localOrder]);

  // за весь элемент: PointerSensor перехватил бы прокрутку пальцем, поэтому мышь отдельно
  const PrimarySensor = isWhole ? MouseSensor : PointerSensor;
  const wholeTouchConstraint: PointerActivationConstraint = {
    delay: pressDelay,
    tolerance: WHOLE_PRESS_TOLERANCE_PX,
  };
  const touchConstraint = isWhole
    ? wholeTouchConstraint
    : HANDLE_TOUCH_CONSTRAINT;
  const sensors = useSensors(
    useSensor(PrimarySensor, {
      activationConstraint: { distance: MOUSE_DRAG_DISTANCE_PX },
    }),
    useSensor(TouchSensor, { activationConstraint: touchConstraint }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // После перетаскивания отпускание не должно сработать как нажатие на ссылку внутри. dnd-kit
  // сам только останавливает всплытие этого нажатия, а переход по ссылке браузер всё равно
  // делает - поэтому отмена здесь, на window до его обработчика.
  const dragEndedAt = useRef(0);
  const isDraggingRef = useRef(false);
  useEffect(() => {
    if (!isWhole) {
      return;
    }

    const onWindowClick = (event: MouseEvent): void => {
      const isJustDropped =
        Date.now() - dragEndedAt.current < CLICK_AFTER_DROP_MS;
      const shouldCancel = isDraggingRef.current || isJustDropped;

      if (shouldCancel) {
        event.preventDefault();
      }
    };
    window.addEventListener('click', onWindowClick, true);

    return () => window.removeEventListener('click', onWindowClick, true);
  }, [isWhole]);

  // схваченный элемент рисуется поверх страницы (в портале), а на его месте - бледная копия:
  // блоки списков обрезают содержимое по скруглённым краям
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIndex = getItemIndex(shownItems, activeId);
  const activeItem = activeIndex >= 0 ? shownItems[activeIndex] : undefined;

  const onDragStart = (event: DragStartEvent): void => {
    isDraggingRef.current = true;
    setActiveId(String(event.active.id));

    // на iPhone вибрации нет
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(PICK_VIBRATION_MS);
    }
  };
  const onDragEnd = (event: DragEndEvent): void => {
    setActiveId(null);
    isDraggingRef.current = false;
    dragEndedAt.current = Date.now();
    const overId = event.over?.id;

    if (overId === undefined) {
      return;
    }

    if (overId === event.active.id) {
      return;
    }

    const from = String(event.active.id);
    const to = String(overId);
    const movedIds = moveItemById(shownItems, from, to).map((item) => item.id);
    setLocalOrder({ base: orderKey, ids: movedIds });
    onReorder(from, to);
  };
  const onDragCancel = (): void => {
    setActiveId(null);
    isDraggingRef.current = false;
    dragEndedAt.current = Date.now();
  };

  return {
    shownItems,
    itemIds,
    sensors,
    activeItem,
    activeIndex,
    onDragStart,
    onDragEnd,
    onDragCancel,
  };
}
