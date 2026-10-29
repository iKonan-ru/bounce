import { useEffect } from 'react';

/**
 * Экран не гаснет, пока открыт текст песни (запись вокала с телефоном на пюпитре)
 *
 * Браузер снимает блокировку при сворачивании - берём её снова, когда страница видна
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    const isSupported = 'wakeLock' in navigator;
    if (!enabled || !isSupported) {
      return;
    }
    let lock: WakeLockSentinel | null = null;
    let isActive = true;
    const requestWakeLock = async (): Promise<void> => {
      const isVisible = document.visibilityState === 'visible';
      if (!isActive || !isVisible) {
        return;
      }
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch (error) {
        // нет разрешения или режим энергосбережения - экран гаснет как обычно
        console.error(error);
      }
    };
    const onVisibilityChange = (): void => {
      void requestWakeLock();
    };
    void requestWakeLock();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      isActive = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (lock) {
        void lock.release().catch(console.error);
      }
    };
  }, [enabled]);
}
