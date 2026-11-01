/** Ширина открытой кнопки удаления */
export const DELETE_WIDTH = 80;

/** Сдвиг для смены статуса после отпускания */
export const ADVANCE_THRESHOLD = 88;

/** Движение меньше порога считается обычным нажатием */
export const AXIS_THRESHOLD = 10;

/** Во сколько раз горизонтальный сдвиг должен превышать вертикальный, чтобы жест стал свайпом */
export const HORIZONTAL_RATIO = 1.25;

/** Насколько строку можно потянуть вправо дальше порога смены статуса */
export const ADVANCE_OVERSHOOT = 24;

/** Свайпы доступны только в мобильной компоновке */
export const MOBILE_QUERY = '(max-width: 767px)';
