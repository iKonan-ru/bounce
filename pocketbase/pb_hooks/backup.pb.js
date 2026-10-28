/// <reference path="../pb_data/types.d.ts" />

// Резервная копия по запросу главного пользователя (автоматических копий нет).
//
//   POST /api/bounce/backup               -> { name }  собрать копию pb_data (база и файлы)
//   GET  /api/bounce/backup/{name}?token= -> zip       скачать; token - файловый токен главного
//   POST /api/bounce/backup/upload  file  -> { name }  загрузить копию на сервер
//   POST /api/bounce/backup/restore {name}            восстановить и перезапуститься
//
// На сервере хранится только последняя копия: перед новой старые удаляются, иначе копии с
// аудио быстро съедят диск. Восстановление заменяет все данные, включая учётные записи, и
// перезапускает процесс: ответ на этот запрос может не дойти, клиент ждёт /api/health.

// Временные файлы загрузки - в каталоге данных: в контейнере /tmp маленький и в памяти.
// Каталог PocketBase чистит сам при старте, так что брошенные загрузки не копятся.
onBootstrap((e) => {
  e.next();
  const tmp = $os.getenv('TMPDIR');
  if (tmp) $os.mkdirAll(tmp, 0o700);
});

routerAdd(
  'POST',
  '/api/bounce/backup',
  (e) => {
    const b = require(`${__hooks}/lib/backup.js`);
    b.requireAdmin(e.app, e.auth.id);
    b.clear(e.app);
    const name = b.newName();
    e.app.createBackup(e.request.context(), name);
    return e.json(200, { name });
  },
  $apis.requireAuth('users'),
);

routerAdd('GET', '/api/bounce/backup/{name}', (e) => {
  const b = require(`${__hooks}/lib/backup.js`);
  const name = e.request.pathValue('name');
  if (!b.NAME.test(name)) throw new NotFoundError();
  let user;
  try {
    user = e.app.findAuthRecordByToken(e.request.url.query().get('token'), 'file');
  } catch (_err) {
    throw new ForbiddenError('Ссылка устарела, скачайте копию заново.');
  }
  b.requireAdmin(e.app, user.id);
  const fsys = e.app.newBackupsFilesystem();
  try {
    if (!fsys.exists(name)) throw new NotFoundError();
    e.response.header().set('Content-Disposition', `attachment; filename="${name}"`);
    fsys.serve(e.response, e.request, name, name);
  } finally {
    fsys.close();
  }
});

routerAdd(
  'POST',
  '/api/bounce/backup/upload',
  (e) => {
    const b = require(`${__hooks}/lib/backup.js`);
    b.requireAdmin(e.app, e.auth.id);
    const files = e.findUploadedFiles('file');
    if (!files || files.length !== 1 || !files[0]) {
      throw new BadRequestError('Нужен один файл копии.');
    }
    b.clear(e.app);
    const name = b.newName();
    const fsys = e.app.newBackupsFilesystem();
    try {
      fsys.uploadFile(files[0], name);
    } finally {
      fsys.close();
    }
    return e.json(200, { name });
  },
  $apis.requireAuth('users'),
  // копия с аудио может весить гигабайты
  $apis.bodyLimit(20 * 1024 * 1024 * 1024),
);

routerAdd(
  'POST',
  '/api/bounce/backup/restore',
  (e) => {
    const b = require(`${__hooks}/lib/backup.js`);
    b.requireAdmin(e.app, e.auth.id);
    const name = String(e.requestInfo().body.name || '');
    if (!b.NAME.test(name)) throw new BadRequestError('Неверное имя копии.');
    e.app.restoreBackup(e.request.context(), name);
    return e.json(200, { ok: true });
  },
  $apis.requireAuth('users'),
);
