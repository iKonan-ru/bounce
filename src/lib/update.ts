import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';

// Новая версия приложения (vite.config.ts, registerType: 'prompt'). Service worker ставит её в
// фоне и ждёт: открытую страницу он не перезагружает, иначе выкладка обрывала бы загрузку файла
// или набор текста. Новая версия включается при следующем запуске приложения (когда закрыты все
// его окна), а пока оно открыто - по кнопке "Обновить".
const UPDATE_TOAST = 'app-update';

export function startUpdates(): void {
  // в этом окне нажали "Обновить" - его и перезагружаем
  let requested = false;

  const update = registerSW({
    immediate: true,
    onNeedRefresh() {
      toast('Вышла новая версия Bounce', {
        id: UPDATE_TOAST,
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: 'Обновить',
          onClick: () => {
            requested = true;
            void update(true);
          },
        },
      });
    },
    // Новая версия взяла управление. Перезагружается только окно, где нажали "Обновить";
    // соседнее (в нём могут набирать текст или грузить файл) просит сделать это самому.
    onNeedReload() {
      if (requested) {
        window.location.reload();
        return;
      }
      toast('Bounce обновился в другом окне', {
        id: UPDATE_TOAST,
        duration: Number.POSITIVE_INFINITY,
        action: { label: 'Перезагрузить', onClick: () => window.location.reload() },
      });
    },
    // приложение на телефоне живёт днями: новую версию ищем при каждом возвращении к нему
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update().catch(() => {});
      });
    },
  });
}
