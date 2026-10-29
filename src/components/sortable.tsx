import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  DragOverlay,
  type DragStartEvent,
  type DropAnimation,
  KeyboardSensor,
  type Modifiers,
  MouseSensor,
  type PointerActivationConstraint,
  PointerSensor,
  type ScreenReaderInstructions,
  type SensorDescriptor,
  type SensorOptions,
  TouchSensor,
  type UniqueIdentifier,
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
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { moveItemById } from '@/lib/stages';
import { cn } from '@/lib/utils';

/** Элемент списка: у каждого свой id */
interface Identified {
  id: string;
}

/** Нарисовать элемент списка: сам элемент, его ручка (null - ручки нет) и место в списке */
type SortableRender<T extends Identified> = (
  item: T,
  handle: ReactNode,
  index: number,
) => ReactNode;

/** Пропсы списка с перетаскиванием */
interface SortableListProps<T extends Identified> {
  items: readonly T[];
  onReorder: (from: string, to: string) => void;
  children: SortableRender<T>;
  className?: string;
  disabled?: boolean;
  /** Вид ручки: по умолчанию - кнопка 40px */
  handleClassName?: string;
  /** Перетаскивать за весь элемент, без ручки: мышью - потянуть, пальцем - нажать и подержать */
  isWhole?: boolean;
  /** Сколько держать палец до начала перетаскивания (для whole), мс */
  pressDelay?: number;
}

/** Местный порядок после перетаскивания: для какого порядка снаружи он и какие id по порядку */
interface LocalOrder {
  /** Порядок снаружи, из которого перетаскивали */
  base: string;
  ids: string[];
}

/** Параметры хука списка с перетаскиванием */
interface UseSortableListParams<T extends Identified> {
  items: readonly T[];
  onReorder: (from: string, to: string) => void;
  isWhole: boolean;
  pressDelay: number;
}

/** Результат хука списка с перетаскиванием */
interface UseSortableListResult<T extends Identified> {
  /** Элементы в показанном порядке */
  shownItems: T[];
  /** id элементов в показанном порядке */
  itemIds: string[];
  sensors: SensorDescriptor<SensorOptions>[];
  /** Схваченный элемент и его место в списке */
  activeItem: T | undefined;
  activeIndex: number;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: () => void;
}

/** Пропсы элемента списка */
interface SortableItemProps<T extends Identified> {
  item: T;
  index: number;
  disabled: boolean | undefined;
  handleClassName: string | undefined;
  isWhole: boolean;
  renderItem: SortableRender<T>;
}

/** Пропсы ручки перетаскивания */
interface DragHandleProps {
  setActivatorNodeRef: (element: HTMLElement | null) => void;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  className: string | undefined;
  disabled: boolean | undefined;
}

/** Пропсы схваченной копии элемента */
interface ActiveItemCopyProps<T extends Identified> {
  item: T;
  index: number;
  handle: ReactNode;
  renderItem: SortableRender<T>;
}

/** Пропсы ручки в схваченной копии */
interface HandleLookProps {
  className: string | undefined;
}

/** Подсказка для экранного диктора по-русски (у dnd-kit она английская) */
const SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    'Чтобы переставить, нажмите пробел или Enter, двигайте стрелками вверх и вниз, ' +
    'ещё раз пробел или Enter - поставить, Escape - отменить.',
};

/** Схваченный элемент опускается на место коротко и мягко */
const DROP_ANIMATION: DropAnimation = { duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' };

/**
 * Местный порядок после перетаскивания ждёт новый список снаружи не дольше этого, мс
 *
 * Если он не пришёл (правку отклонили), снова виден порядок снаружи
 */
const LOCAL_ORDER_MS = 4000;

/** Разделитель id в ключе порядка */
const ORDER_KEY_SEPARATOR = ',';

/** Сколько протянуть мышью до начала перетаскивания, px */
const MOUSE_DRAG_DISTANCE_PX = 4;

/** Сколько держать палец на ручке до начала перетаскивания, мс */
const HANDLE_PRESS_DELAY_MS = 120;

/** Насколько палец может сдвинуться, пока держат ручку, px */
const HANDLE_PRESS_TOLERANCE_PX = 8;

/** Сколько держать палец на элементе до начала перетаскивания за весь элемент, мс */
const WHOLE_PRESS_DELAY_MS = 300;

/** Насколько палец может сдвинуться, пока держат элемент, px */
const WHOLE_PRESS_TOLERANCE_PX = 6;

/** Начало перетаскивания пальцем за ручку */
const HANDLE_TOUCH_CONSTRAINT: PointerActivationConstraint = {
  delay: HANDLE_PRESS_DELAY_MS,
  tolerance: HANDLE_PRESS_TOLERANCE_PX,
};

/** Сколько после отпускания нажатие ещё считается частью перетаскивания, мс */
const CLICK_AFTER_DROP_MS = 400;

/** Короткий отклик вибрацией, когда элемент взят, мс */
const PICK_VIBRATION_MS = 10;

/** Схваченная копия - над окнами и панелями */
const DRAG_OVERLAY_Z_INDEX = 60;

/** Элементы ходят только вверх и вниз */
const VERTICAL_MODIFIERS: Modifiers = [restrictToVerticalAxis];

/** Место не найдено */
const NOT_FOUND_INDEX = -1;

/** Зона нажатия ручки - вся её высота, а подсветка при наведении - только вокруг значка */
const HANDLE_CLASS_NAME =
  'group/handle flex shrink-0 cursor-grab touch-none items-center justify-center text-dim transition-opacity active:cursor-grabbing disabled:opacity-30';

/** Размер ручки по умолчанию: кнопка 40px */
const DEFAULT_HANDLE_SIZE_CLASS_NAME = 'size-10';

/**
 * Объявления для экранного диктора по-русски (у dnd-kit они английские)
 *
 * Элементы называются по месту в списке: id записей человеку ничего не скажут
 */
function getAnnouncements(ids: string[]): Announcements {
  const getPlace = (id: UniqueIdentifier): number => ids.indexOf(String(id)) + 1;
  return {
    onDragStart: ({ active }) => `Взят элемент ${getPlace(active.id)} из ${ids.length}.`,
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

/** Элементы в местном порядке, если он есть, иначе - как пришли снаружи */
function getShownItems<T extends Identified>(items: readonly T[], order: string[] | null): T[] {
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
function getItemIndex<T extends Identified>(items: readonly T[], id: string | null): number {
  if (id === null) {
    return NOT_FOUND_INDEX;
  }
  return items.findIndex((item) => item.id === id);
}

/** Порядок, перетаскивание и датчики списка */
function useSortableList<T extends Identified>({
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
  const isLocalOrderCurrent = localOrder !== null && localOrder.base === orderKey;
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
  const touchConstraint = isWhole ? wholeTouchConstraint : HANDLE_TOUCH_CONSTRAINT;
  const sensors = useSensors(
    useSensor(PrimarySensor, { activationConstraint: { distance: MOUSE_DRAG_DISTANCE_PX } }),
    useSensor(TouchSensor, { activationConstraint: touchConstraint }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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
      const isJustDropped = Date.now() - dragEndedAt.current < CLICK_AFTER_DROP_MS;
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
    document.body,
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

/** Ручка перетаскивания: кнопка со значком */
function DragHandle({
  setActivatorNodeRef,
  attributes,
  listeners,
  className,
  disabled,
}: DragHandleProps): ReactNode {
  const handleButtonClassName = cn(HANDLE_CLASS_NAME, className ?? DEFAULT_HANDLE_SIZE_CLASS_NAME);
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label="Перетащить"
      className={handleButtonClassName}
      disabled={disabled}
      {...attributes}
      {...listeners}
    >
      <HandleIcon />
    </button>
  );
}

/** Элемент списка: за ручку или, с isWhole, за весь элемент */
function SortableItem<T extends Identified>({
  item,
  index,
  disabled,
  handleClassName,
  isWhole,
  renderItem,
}: SortableItemProps<T>): ReactNode {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: disabled ?? false,
  });
  // клавиатура: Пробел и Enter на самой строке - перетаскивание, на ссылке внутри - переход
  const onRowKeyDown = (event: KeyboardEvent<HTMLLIElement>): void => {
    if (event.target !== event.currentTarget) {
      return;
    }
    const onListenerKeyDown = listeners?.onKeyDown;
    if (onListenerKeyDown) {
      onListenerKeyDown(event);
    }
  };
  const handle = (
    <DragHandle
      setActivatorNodeRef={setActivatorNodeRef}
      attributes={attributes}
      listeners={listeners}
      className={handleClassName}
      disabled={disabled}
    />
  );
  const rowHandle = isWhole ? null : handle;
  const content = renderItem(item, rowHandle, index);
  const wholeRowProps = { ...attributes, ...listeners, onKeyDown: onRowKeyDown };
  const rowDragProps = isWhole ? wholeRowProps : undefined;
  const rowStyle: CSSProperties = { transform: CSS.Translate.toString(transform), transition };
  const rowClassName = cn('relative', {
    'select-none [-webkit-touch-callout:none]': isWhole,
    'opacity-35': isDragging,
  });
  return (
    <li ref={setNodeRef} style={rowStyle} className={rowClassName} {...rowDragProps}>
      {content}
    </li>
  );
}

/** Значок ручки с подсветкой при наведении */
function HandleIcon(): ReactNode {
  return (
    <span className="flex h-7 w-5 items-center justify-center rounded-md transition-colors group-hover/handle:bg-groove group-hover/handle:text-ink">
      <GripVertical className="size-4" />
    </span>
  );
}

/** Ручка в схваченной копии: только вид */
function HandleLook({ className }: HandleLookProps): ReactNode {
  const handleLookClassName = cn(
    HANDLE_CLASS_NAME,
    'cursor-grabbing',
    className ?? DEFAULT_HANDLE_SIZE_CLASS_NAME,
  );
  return (
    <span aria-hidden="true" className={handleLookClassName}>
      <HandleIcon />
    </span>
  );
}
