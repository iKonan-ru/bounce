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

      group.style.setProperty('--indicator-x', `${selected.offsetLeft}px`);
      group.style.setProperty('--indicator-y', `${selected.offsetTop}px`);
      group.style.setProperty('--indicator-width', `${selected.offsetWidth}px`);
      group.style.setProperty(
        '--indicator-height',
        `${selected.offsetHeight}px`
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
