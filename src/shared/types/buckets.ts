/** Группа сроков */
export enum Bucket {
  /** Срок прошёл */
  Overdue = 'overdue',
  /** Сегодня */
  Today = 'today',
  /** Завтра */
  Tomorrow = 'tomorrow',
  /** До конца ближайших семи дней */
  Week = 'week',
  /** Позже */
  Later = 'later',
  /** Без срока */
  None = 'none',
}

/** Группа плана: срок и пункты в нём */
export interface PlanGroup<Item> {
  bucket: Bucket;
  items: Item[];
}

/** Запись с исполнителями */
export interface Assignable {
  assignees?: readonly string[] | undefined;
}

/** Запись со сроком */
export interface Dated {
  due: string;
}
