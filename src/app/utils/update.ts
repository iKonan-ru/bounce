// Новая версия ставится в фоне. Плашка даёт 5 секунд до автоматического обновления;
// кнопка применяет его сразу (vite.config.ts, registerType: 'prompt').
import { createElement } from 'react';
import { toast } from 'sonner';
import { registerSW } from 'virtual:pwa-register';
import { UPDATE_TOAST_ID, UPDATE_DELAY_MS } from '../constants/update';
import { UpdateProgress } from '../ui/update-progress';

/** Перезагрузить страницу */
function reloadPage(): void {
  window.location.reload();
}

/** Регистрирует service worker и предлагает обновиться, когда вышла новая версия */
export function startUpdates(): void {
  let isReloadRequested = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const showUpdate = (
    message: string,
    label: string,
    apply: () => void
  ): void => {
    clearTimeout(timer);
    let isApplied = false;
    const onUpdate = (): void => {
      if (isApplied) {
        return;
      }

      isApplied = true;
      clearTimeout(timer);
      apply();
    };
    toast(message, {
      id: UPDATE_TOAST_ID,
      duration: Number.POSITIVE_INFINITY,
      dismissible: false,
      className: 'app-update-toast',
      description: createElement(UpdateProgress, { key: message }),
      action: { label, onClick: onUpdate },
    });
    timer = setTimeout(onUpdate, UPDATE_DELAY_MS);
  };

  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      showUpdate('Вышла новая версия Bounce', 'Обновить', () => {
        isReloadRequested = true;
        void updateServiceWorker(true);
      });
    },
    // Соседнее окно тоже показывает плашку перед своей перезагрузкой.
    onNeedReload() {
      if (isReloadRequested) {
        clearTimeout(timer);
        reloadPage();

        return;
      }

      showUpdate('Bounce обновился в другом окне', 'Перезагрузить', reloadPage);
    },
    // приложение на телефоне живёт днями: новую версию ищем при каждом возвращении к нему
    onRegisteredSW(_url, registration) {
      if (!registration) {
        return;
      }

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void registration.update().catch(console.error);
        }
      });
    },
  });
}
