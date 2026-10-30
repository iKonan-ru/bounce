/// <reference path="../pb_data/types.d.ts" />

// Старые клиенты создают музыкальные проекты без нового поля. Явно пустой выбор запрещён.
onRecordCreateRequest((event) => {
  const body = event.requestInfo().body;

  if (!Object.prototype.hasOwnProperty.call(body, 'directions')) {
    event.record.set('directions', ['music']);
  }

  return event.next();
}, 'projects');

// Проверка модели защищает также частичные обновления и модификаторы массива directions.
onRecordValidate((event) => {
  const directions = event.record.getStringSlice('directions');

  if (directions.length === 0) {
    throw new BadRequestError('Выберите хотя бы одно направление проекта.');
  }

  if (directions.indexOf('video') >= 0) {
    throw new BadRequestError('Направление "Видео" пока недоступно.');
  }

  return event.next();
}, 'projects');
