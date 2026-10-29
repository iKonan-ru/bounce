import { MINUTE_MS } from '@/shared/constants';

/** Как часто проект загружается целиком */
export const SYNC_EVERY = 10 * MINUTE_MS;

/** Снимков заметок - только самые свежие: остальные откроются, когда будет сеть */
export const NOTE_IMAGES_MAX = 120;

/** Сколько картинок качается одновременно, чтобы не забить канал */
export const PICTURE_WORKERS = 3;

/** Миниатюра обложки и аватара в списках */
export const THUMB_SMALL = '96x96';

/** Обложка на странице песни */
export const THUMB_COVER = '600x600';

/** Снимок в ленте заметок */
export const THUMB_NOTE_IMAGE = '480x0';
