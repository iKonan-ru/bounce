// Экранная клавиатура на телефоне. Android (Chrome) по interactive-widget=resizes-content в
// index.html сам ужимает страницу над клавиатурой; iOS так не умеет - там высоту клавиатуры
// считаем по visualViewport и кладём в --kb: окна центруются по видимой части экрана.
// Пока набирают текст, у <html> есть data-typing: нижние вкладки прячутся, чтобы не висеть над
// клавиатурой.

const EDITABLE =
  'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=button]):not([type=submit]), textarea, [contenteditable="true"]';

export function watchKeyboard(): void {
  const root = document.documentElement;
  const vv = window.visualViewport;
  if (vv) {
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--kb', `${Math.round(kb)}px`);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
  }
  const touch = window.matchMedia('(pointer: coarse)');
  document.addEventListener('focusin', (e) => {
    if (touch.matches && e.target instanceof Element && e.target.matches(EDITABLE)) {
      root.dataset['typing'] = '';
    }
  });
  document.addEventListener('focusout', () => {
    // фокус переходит из поля в поле - не мигаем вкладками
    setTimeout(() => {
      const a = document.activeElement;
      if (!(a instanceof Element && a.matches(EDITABLE))) delete root.dataset['typing'];
    }, 50);
  });
}
