import type { ReactNode } from 'react';
import type { PlanGroup, Bucket } from './buckets';

/** Пункт списка: ключ строки - его id */
export interface ListItem {
  id: string;
}

/** Пропсы пунктов по срокам */
export interface BucketedSectionsProps<
  Item extends ListItem,
  DoneItem extends ListItem,
> {
  groups: readonly PlanGroup<Item>[];
  /** Название группы без срока */
  noneLabel?: string;
  renderItem: (item: Item, bucket: Bucket) => ReactNode;
  /** Сделанное: свёрнуто внизу */
  done: readonly DoneItem[];
  /** Название свёрнутого сделанного: "Выполнено", "Опубликовано" */
  doneLabel: string;
  renderDone: (item: DoneItem) => ReactNode;
}

/** Пропсы секции одной группы сроков */
export interface BucketSectionProps<Item extends ListItem> {
  group: PlanGroup<Item>;
  /** Название группы без срока */
  noneLabel: string;
  renderItem: (item: Item, bucket: Bucket) => ReactNode;
}
