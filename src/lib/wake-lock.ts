import { useEffect } from 'react';

// Экран не гаснет, пока открыт текст песни (запись вокала с телефоном на пюпитре). Браузер
// снимает блокировку при сворачивании - берём её снова, когда страница видна.
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let active = true;
    const take = async () => {
      try {
        if (active && document.visibilityState === 'visible') {
          lock = await navigator.wakeLock.request('screen');
        }
      } catch {
        // нет разрешения или режим энергосбережения - экран гаснет как обычно
      }
    };
    void take();
    const onVisible = () => void take();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [enabled]);
}
