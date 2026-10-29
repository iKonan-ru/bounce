/// <reference path="../pb_data/types.d.ts" />

// Чужую заметку редактор может только отметить "стала песней" (1762400000_roles.js). Поле с
// исходными именами аудио (audio_names) появилось позже (1762700000_content.js) и в список
// неизменяемых полей не попало: редактор мог переименовать файлы в чужой заметке.

/** Конец списка неизменяемых полей в части редактора до этой миграции */
const CONDITION_BEFORE = '@request.body.stage:changed = false';

/** Тот же конец списка вместе с audio_names */
const CONDITION_AFTER = `${CONDITION_BEFORE} && @request.body.audio_names:changed = false`;

/** Заменить в правиле обновления заметок условие from на to */
function replaceCondition(app, from, to) {
  const notes = app.findCollectionByNameOrId('notes');
  const rule = notes.updateRule || '';
  // условие встречается в правиле один раз - в части редактора; иначе правило уже другое
  const isFoundOnce = rule.split(from).length === 2;
  if (!isFoundOnce) {
    throw new Error(`notes.updateRule: не найдено ровно одно "${from}"`);
  }
  notes.updateRule = rule.replace(from, to);
  app.save(notes);
}

migrate(
  (app) => replaceCondition(app, CONDITION_BEFORE, CONDITION_AFTER),
  (app) => replaceCondition(app, CONDITION_AFTER, CONDITION_BEFORE),
);
