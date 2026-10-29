import type { ReactNode } from 'react';
import type {
  SensorDescriptor,
  SensorOptions,
  DragStartEvent,
  DragEndEvent,
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@dnd-kit/core';

/** Элемент списка: у каждого свой id */
export interface Identified {
  id: string;
}

/** Нарисовать элемент списка: сам элемент, его ручка (null - ручки нет) и место в списке */
type SortableRender<T extends Identified> = (
  item: T,
  handle: ReactNode,
  index: number
) => ReactNode;

/** Пропсы списка с перетаскиванием */
export interface SortableListProps<T extends Identified> {
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
export interface LocalOrder {
  /** Порядок снаружи, из которого перетаскивали */
  base: string;
  ids: string[];
}

/** Параметры хука списка с перетаскиванием */
export interface UseSortableListParams<T extends Identified> {
  items: readonly T[];
  onReorder: (from: string, to: string) => void;
  isWhole: boolean;
  pressDelay: number;
}

/** Результат хука списка с перетаскиванием */
export interface UseSortableListResult<T extends Identified> {
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
export interface SortableItemProps<T extends Identified> {
  item: T;
  index: number;
  disabled: boolean | undefined;
  handleClassName: string | undefined;
  isWhole: boolean;
  renderItem: SortableRender<T>;
}

/** Пропсы ручки перетаскивания */
export interface DragHandleProps {
  setActivatorNodeRef: (element: HTMLElement | null) => void;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  className: string | undefined;
  disabled: boolean | undefined;
}

/** Пропсы схваченной копии элемента */
export interface ActiveItemCopyProps<T extends Identified> {
  item: T;
  index: number;
  handle: ReactNode;
  renderItem: SortableRender<T>;
}

/** Пропсы ручки в схваченной копии */
export interface HandleLookProps {
  className: string | undefined;
}
