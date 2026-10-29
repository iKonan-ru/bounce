/** Поля, в которых набирают текст */
export const EDITABLE_SELECTOR =
  'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=button]):not([type=submit]), textarea, [contenteditable="true"]';

/** Устройство с сенсорным экраном */
export const TOUCH_QUERY = '(pointer: coarse)';

/** Пауза перед тем, как вернуть вкладки: фокус переходит из поля в поле - не мигаем ими */
export const TYPING_RESET_DELAY_MS = 50;
