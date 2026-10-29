import type { ReactNode, KeyboardEvent, CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  HANDLE_CLASS_NAME,
  DEFAULT_HANDLE_SIZE_CLASS_NAME,
} from '../constants/sortable';
import type {
  DragHandleProps,
  Identified,
  SortableItemProps,
} from '../types/sortable';
import { cn } from '../utils/cn';
import { HandleIcon } from './handle-icon';

/** Ручка перетаскивания: кнопка со значком */
function DragHandle({
  setActivatorNodeRef,
  attributes,
  listeners,
  className,
  disabled,
}: DragHandleProps): ReactNode {
  const handleButtonClassName = cn(
    HANDLE_CLASS_NAME,
    className ?? DEFAULT_HANDLE_SIZE_CLASS_NAME
  );

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
export function SortableItem<T extends Identified>({
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
  const wholeRowProps = {
    ...attributes,
    ...listeners,
    onKeyDown: onRowKeyDown,
  };
  const rowDragProps = isWhole ? wholeRowProps : undefined;
  const rowStyle: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };
  const rowClassName = cn('relative', {
    'select-none [-webkit-touch-callout:none]': isWhole,
    'opacity-35': isDragging,
  });

  return (
    <li
      ref={setNodeRef}
      style={rowStyle}
      className={rowClassName}
      {...rowDragProps}
    >
      {content}
    </li>
  );
}
