import type {
  ScreenReaderInstructions,
  DropAnimation,
  PointerActivationConstraint,
  Modifiers,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

/** Подсказка для экранного диктора по-русски (у dnd-kit она английская) */
export const SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    'Чтобы переставить, нажмите пробел или Enter, двигайте стрелками вверх и вниз, ' +
    'ещё раз пробел или Enter - поставить, Escape - отменить.',
};

/** Схваченный элемент опускается на место коротко и мягко */
export const DROP_ANIMATION: DropAnimation = {
  duration: 180,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
};

/**
 * Местный порядок после перетаскивания ждёт новый список снаружи не дольше этого, мс
 *
 * Если он не пришёл (правку отклонили), снова виден порядок снаружи
 */
export const LOCAL_ORDER_MS = 4000;

/** Разделитель id в ключе порядка */
export const ORDER_KEY_SEPARATOR = ',';

/** Сколько протянуть мышью до начала перетаскивания, px */
export const MOUSE_DRAG_DISTANCE_PX = 4;

/** Сколько держать палец на ручке до начала перетаскивания, мс */
const HANDLE_PRESS_DELAY_MS = 120;

/** Насколько палец может сдвинуться, пока держат ручку, px */
const HANDLE_PRESS_TOLERANCE_PX = 8;

/** Сколько держать палец на элементе до начала перетаскивания за весь элемент, мс */
export const WHOLE_PRESS_DELAY_MS = 300;

/** Насколько палец может сдвинуться, пока держат элемент, px */
export const WHOLE_PRESS_TOLERANCE_PX = 6;

/** Начало перетаскивания пальцем за ручку */
export const HANDLE_TOUCH_CONSTRAINT: PointerActivationConstraint = {
  delay: HANDLE_PRESS_DELAY_MS,
  tolerance: HANDLE_PRESS_TOLERANCE_PX,
};

/** Сколько после отпускания нажатие ещё считается частью перетаскивания, мс */
export const CLICK_AFTER_DROP_MS = 400;

/** Короткий отклик вибрацией, когда элемент взят, мс */
export const PICK_VIBRATION_MS = 10;

/** Схваченная копия - над окнами и панелями */
export const DRAG_OVERLAY_Z_INDEX = 60;

/** Элементы ходят только вверх и вниз */
export const VERTICAL_MODIFIERS: Modifiers = [restrictToVerticalAxis];

/** Место не найдено */
export const NOT_FOUND_INDEX = -1;

/** Зона нажатия ручки - вся её высота, а подсветка при наведении - только вокруг значка */
export const HANDLE_CLASS_NAME =
  'group/handle flex shrink-0 cursor-grab touch-none items-center justify-center text-dim transition-opacity active:cursor-grabbing disabled:opacity-30';

/** Размер ручки по умолчанию: кнопка 40px */
export const DEFAULT_HANDLE_SIZE_CLASS_NAME = 'size-10';
