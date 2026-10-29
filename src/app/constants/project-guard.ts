/** Id маршрута проекта */
export const PROJECT_ROUTE_ID = '/app/p/$projectId';

/** Статусы ответа: проекта нет или доступ к нему закрыли */
export const PROJECT_GONE_STATUSES: ReadonlySet<number> = new Set([403, 404]);
