import { useState, useEffect } from 'react';
import type { UseDurationResult } from '../types/audio-player';

/** Длительность записи до запуска: читаются только её заголовки */
export function useDuration(src: string | undefined): UseDurationResult {
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    if (!src) {
      return;
    }

    const audio = new Audio();
    audio.preload = 'metadata';
    const onMetadataLoad = (): void => {
      setDuration(audio.duration);
    };
    audio.addEventListener('loadedmetadata', onMetadataLoad);
    audio.src = src;

    return () => {
      audio.removeEventListener('loadedmetadata', onMetadataLoad);
      audio.removeAttribute('src');
      audio.load();
    };
  }, [src]);

  return { duration };
}
