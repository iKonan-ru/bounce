/** Сигнал сервера без содержимого закрытых заметок */
export const NOTE_ACCESS_TOPIC = 'notes-access';

/** Изменение доступа останавливает недоступное аудио */
export const NOTE_ACCESS_EVENT = 'bounce:note-access';

/** Снимок разрешенных вложений для service worker */
export const NOTE_ACCESS_CACHE = 'bounce-note-access';

/** Служебный ключ внутри кэша, не сетевой маршрут */
export const NOTE_ACCESS_KEY = '/__bounce_note_access__';

/** Id коллекции из исходной миграции; нужен и для файловых адресов */
export const NOTES_COLLECTION_ID = 'pbc_3395098727';
