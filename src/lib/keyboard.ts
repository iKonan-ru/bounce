// Экранная клавиатура на телефоне. Android (Chrome) по interactive-widget=resizes-content в
// index.html сам ужимает страницу над клавиатурой; iOS так не умеет - там высоту клавиатуры
// считаем по visualViewport и кладём в --kb: окна центруются по видимой части экрана.
// Пока набирают текст, у <html> есть data-typing: нижние вкладки прячутся, чтобы не висеть над
// клавиатурой.
/** Поля, в которых набирают текст */
const EDITABLE_SELECTOR =
  'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=button]):not([type=submit]), textarea, [contenteditable="true"]';

/** Устройство с сенсорным экраном */
const TOUCH_QUERY = '(pointer: coarse)';

/** Пауза перед тем, как вернуть вкладки: фокус переходит из поля в поле - не мигаем ими */
const TYPING_RESET_DELAY_MS = 50;

/** Элемент - поле для набора текста */
function checkIsEditable(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.matches(EDITABLE_SELECTOR);
}

/** Следит за экранной клавиатурой: высота в --kb и data-typing у <html> */
export function watchKeyboard(): void {
  const root = document.documentElement;
  const viewport = window.visualViewport;

  if (viewport) {
    const updateKeyboardHeight = (): void => {
      const keyboardHeight = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop
      );
      root.style.setProperty('--kb', `${Math.round(keyboardHeight)}px`);
    };
    viewport.addEventListener('resize', updateKeyboardHeight);
    viewport.addEventListener('scroll', updateKeyboardHeight);
    updateKeyboardHeight();
  }

  const touchQuery = window.matchMedia(TOUCH_QUERY);
  document.addEventListener('focusin', (event) => {
    const isTyping = touchQuery.matches && checkIsEditable(event.target);

    if (isTyping) {
      root.dataset.typing = '';
    }
  });
  document.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!checkIsEditable(document.activeElement)) {
        delete root.dataset.typing;
      }
    }, TYPING_RESET_DELAY_MS);
  });
}
