import { useLayoutEffect, useRef } from 'react';

/** Подложка следует за выбранным пунктом, включая перенос строк и смену ширины */
export function useSegmentedIndicator<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const group = ref.current;

    if (!group) {
      return;
    }

    const update = (): void => {
      const selected = group.querySelector<HTMLElement>(
        '[data-selected="true"]'
      );

      if (!selected) {
        delete group.dataset.indicatorReady;

        return;
      }

      const groupRect = group.getBoundingClientRect();

      // Нижнее меню скрыто на десктопе и при вводе с экранной клавиатуры.
      if (!groupRect.width || !groupRect.height) {
        delete group.dataset.indicatorReady;

        return;
      }

      const selectedRect = selected.getBoundingClientRect();
      // Анимация диалога может масштабировать всю группу: координаты нужны до масштаба.
      const groupStyle = getComputedStyle(group);
      const scaleX = groupRect.width / Number.parseFloat(groupStyle.width);
      const scaleY = groupRect.height / Number.parseFloat(groupStyle.height);
      group.style.setProperty(
        '--indicator-x',
        `${(selectedRect.left - groupRect.left) / scaleX - group.clientLeft}px`
      );
      group.style.setProperty(
        '--indicator-y',
        `${(selectedRect.top - groupRect.top) / scaleY - group.clientTop}px`
      );
      group.style.setProperty(
        '--indicator-width',
        `${selectedRect.width / scaleX}px`
      );
      group.style.setProperty(
        '--indicator-height',
        `${selectedRect.height / scaleY}px`
      );
      group.dataset.indicatorReady = 'true';
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(group);

    for (const item of group.querySelectorAll<HTMLElement>('[data-selected]')) {
      observer.observe(item);
    }

    return () => observer.disconnect();
  });

  return ref;
}
