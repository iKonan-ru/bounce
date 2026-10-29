/// <reference path="../pb_data/types.d.ts" />

// Чужую заметку редактор может только отметить "стала песней" (1762400000_roles.js). Поле с
// исходными именами аудио (audio_names) появилось позже (1762700000_content.js) и в список
// неизменяемых полей не попало: редактор мог переименовать файлы в чужой заметке.

const BEFORE = '@request.body.stage:changed = false';
const AFTER = `${BEFORE} && @request.body.audio_names:changed = false`;

function swap(app, from, to) {
  const notes = app.findCollectionByNameOrId('notes');
  const rule = notes.updateRule || '';
  // условие встречается в правиле один раз - в части редактора; иначе правило уже другое
  if (rule.split(from).length !== 2) {
    throw new Error(`notes.updateRule: не найдено ровно одно "${from}"`);
  }
  notes.updateRule = rule.replace(from, to);
  app.save(notes);
}

migrate(
  (app) => swap(app, BEFORE, AFTER),
  (app) => swap(app, AFTER, BEFORE),
);
