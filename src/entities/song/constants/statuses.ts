import { StageStatus, SongStatus } from '../types/song';

/** Подписи статусов этапа */
export const STAGE_STATUS_LABEL: Record<StageStatus, string> = {
  [StageStatus.not_started]: 'Не начат',
  [StageStatus.in_progress]: 'В работе',
  [StageStatus.done]: 'Готово',
  [StageStatus.skipped]: 'Пропущен',
};

/** Статусы этапа по порядку */
export const STAGE_STATUSES: StageStatus[] = Object.values(StageStatus);

/** Закрытые этапы: готовые и пропущенные - работы по ним больше нет */
export const CLOSED_STAGE_STATUSES: ReadonlySet<StageStatus> = new Set([
  StageStatus.done,
  StageStatus.skipped,
]);

/** Подписи статусов песни */
export const SONG_STATUS_LABEL: Record<SongStatus, string> = {
  [SongStatus.not_started]: 'Не начата',
  [SongStatus.active]: 'В работе',
  [SongStatus.paused]: 'На паузе',
  [SongStatus.done]: 'Готова',
  [SongStatus.sent]: 'Отправлена на лейбл',
  [SongStatus.released]: 'Выпущена',
};

/** Статусы песни по порядку */
export const SONG_STATUSES: SongStatus[] = Object.values(SongStatus);

/**
 * Статусы песни, которые выбирают руками
 *
 * "Отправлена" - через раздел "Релиз", "выпущена" - сама. Новая песня "не начата"; когда этап
 * берут в работу, сервер сам ставит "в работе"
 */
export const MANUAL_SONG_STATUSES: SongStatus[] = [
  SongStatus.not_started,
  SongStatus.active,
  SongStatus.paused,
  SongStatus.done,
];
