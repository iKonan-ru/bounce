import type { Ordered, Positioned } from '../types/order';

/** Сравнение для сортировки по ручному порядку */
export function comparePositions(first: Ordered, second: Ordered): number {
  return first.position - second.position;
}

/** Позиция для нового элемента в конце списка */
export function getNextPosition(items: readonly Positioned[]): number {
  return items.reduce(
    (maxPosition, item) => Math.max(maxPosition, item.position + 1),
    0
  );
}

/** Элемент с id from встаёт на место элемента с id to */
export function moveItemById<Item extends { id: string }>(
  items: readonly Item[],
  from: string,
  to: string
): Item[] {
  const list = [...items];
  const fromIndex = list.findIndex((item) => item.id === from);
  const toIndex = list.findIndex((item) => item.id === to);
  const isMissing = fromIndex < 0 || toIndex < 0;

  if (isMissing || fromIndex === toIndex) {
    return list;
  }

  const [moved] = list.splice(fromIndex, 1);

  if (moved) {
    list.splice(toIndex, 0, moved);
  }

  return list;
}
