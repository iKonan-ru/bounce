import { SongStatus, SONG_STATUSES, SONG_STATUS_LABEL } from '@/entities/song';
import type { SongFilter, ScrollEdges } from '../types/project';
import { FilterOption } from '../types/project';

/** Id маршрута страницы проекта */
export const PROJECT_ROUTE_ID = '/app/p/$projectId/';

/** Таблица - на широком экране; песня - вся свободная ширина, под названием - текущий этап */
export const TABLE_COLUMNS =
  'lg:grid lg:grid-cols-[minmax(0,1fr)_11rem_10rem_6rem] lg:gap-6';

/** Таблица без столбца релиза */
export const BASIC_TABLE_COLUMNS =
  'lg:grid lg:grid-cols-[minmax(0,1fr)_11rem_10rem] lg:gap-6';

/** Статусы песен, которые уже ушли из работы: отправлены на лейбл или выпущены */
export const OUT_STATUSES: ReadonlySet<SongStatus> = new Set([
  SongStatus.sent,
  SongStatus.released,
]);

/** Фильтры списка песен по порядку */
export const SONG_FILTERS: readonly SongFilter[] = [
  FilterOption.All,
  ...SONG_STATUSES,
];

/** Подписи фильтров списка песен */
export const SONG_FILTER_LABEL: Record<SongFilter, string> = {
  [FilterOption.All]: 'Все',
  ...SONG_STATUS_LABEL,
};

/** Задержка нажатия перед перетаскиванием песни в режиме порядка */
export const ORDER_PRESS_DELAY_MS = 150;

/** Клавиша, которая применяет порядок */
export const ESCAPE_KEY = 'Escape';

/** Запас в пикселях, с которым край полосы считается достигнутым */
export const EDGE_TOLERANCE_PX = 1;

/** Градиент над краем полосы, за которым есть ещё */
export const FADE_CLASS_NAME =
  'pointer-events-none absolute inset-y-0 w-10 from-console to-transparent transition-opacity';

/** Ничего не скрыто ни с одного края */
export const NO_SCROLL_EDGES: ScrollEdges = {
  hasMoreLeft: false,
  hasMoreRight: false,
};
