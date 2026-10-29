import { toast } from 'sonner';
import { registerSW } from 'virtual:pwa-register';

// Новая версия приложения (vite.config.ts, registerType: 'prompt'). Service worker ставит её в
// фоне и ждёт: открытую страницу он не перезагружает, иначе выкладка обрывала бы загрузку файла
// или набор текста. Новая версия включается при следующем запуске приложения (когда закрыты все
// его окна), а пока оно открыто - по кнопке "Обновить".

/** Id уведомления о новой версии: новое заменяет прежнее */
const UPDATE_TOAST_ID = 'app-update';

/** Перезагрузить страницу */
function reloadPage(): void {
  window.location.reload();
}

/** Регистрирует service worker и предлагает обновиться, когда вышла новая версия */
export function startUpdates(): void {
  // в этом окне нажали "Обновить" - его и перезагружаем
  let isReloadRequested = false;

  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      toast('Вышла новая версия Bounce', {
        id: UPDATE_TOAST_ID,
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: 'Обновить',
          onClick: () => {
            isReloadRequested = true;
            void updateServiceWorker(true);
          },
        },
      });
    },
    // Новая версия взяла управление. Перезагружается только окно, где нажали "Обновить";
    // соседнее (в нём могут набирать текст или грузить файл) просит сделать это самому.
    onNeedReload() {
      if (isReloadRequested) {
        reloadPage();

        return;
      }

      toast('Bounce обновился в другом окне', {
        id: UPDATE_TOAST_ID,
        duration: Number.POSITIVE_INFINITY,
        action: { label: 'Перезагрузить', onClick: reloadPage },
      });
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
