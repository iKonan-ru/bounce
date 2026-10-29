/** Разделитель исполнителя и альбома */
export const SUBTITLE_SEPARATOR = ' \u00B7 ';

/** Процентов в целом */
export const PERCENT = 100;

/** Шаг перемотки стрелками, секунд */
const SEEK_ARROW_SECONDS = 5;

/** Шаг перемотки клавишами PageUp и PageDown, секунд */
const SEEK_PAGE_SECONDS = 30;

/** Сдвиг перемотки по клавише, секунд */
export const SEEK_SHIFT_BY_KEY: Record<string, number> = {
  ArrowRight: SEEK_ARROW_SECONDS,
  ArrowUp: SEEK_ARROW_SECONDS,
  ArrowLeft: -SEEK_ARROW_SECONDS,
  ArrowDown: -SEEK_ARROW_SECONDS,
  PageUp: SEEK_PAGE_SECONDS,
  PageDown: -SEEK_PAGE_SECONDS,
};

/** Ниже этой громкости значок - тихий динамик */
export const QUIET_VOLUME = 0.5;

/** Громкость, с которой включается звук, если её убрали до нуля */
export const UNMUTE_VOLUME = 0.6;

/** Шаг ползунка громкости */
export const VOLUME_STEP = 0.01;

/** Кнопка-значок громкости */
export const ICON_BUTTON_CLASS_NAME =
  'flex size-9 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-groove hover:text-ink';
