import type { RefObject } from 'react';
import { useState, useEffect } from 'react';
import { NEAR_SCREEN_MARGIN } from '../constants/audio-player';
import type { UseNearScreenResult } from '../types/audio-player';

/**
 * Запись показалась на экране (или вот-вот покажется)
 *
 * До этого файл не трогаем: в ленте "Все заметки" десятки записей, и каждая просила бы у сервера
 * заголовки
 */
export function useNearScreen(
  ref: RefObject<HTMLElement | null>
): UseNearScreenResult {
  const [isNearScreen, setIsNearScreen] = useState(false);
  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    if (isNearScreen) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsNearScreen(true);

      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNearScreen(true);
        }
      },
      { rootMargin: NEAR_SCREEN_MARGIN }
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, isNearScreen]);

  return { isNearScreen };
}
