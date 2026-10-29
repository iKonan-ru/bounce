/// <reference path="../pb_data/types.d.ts" />

// Резервная копия по запросу главного пользователя (автоматических копий нет).
//
//   POST /api/bounce/backup               -> { name }  собрать копию pb_data (база и файлы)
//   GET  /api/bounce/backup/{name}?token= -> zip       скачать; token - файловый токен главного
//   POST /api/bounce/backup/upload  file  -> { name }  загрузить копию на сервер
//   POST /api/bounce/backup/restore {name}            восстановить и перезапуститься
//
// На сервере хранится только последняя копия: когда новая готова, старые удаляются, иначе копии
// с аудио быстро съедят диск (на время сборки нужно место ещё под две: новую и её временный
// файл). Восстановление заменяет все данные, включая учётные записи, и перезапускает процесс:
// ответ на этот запрос может не дойти, клиент ждёт /api/health.

// Временные файлы загрузки - в каталоге данных: в контейнере /tmp маленький и в памяти.
// Каталог PocketBase чистит сам при старте, так что брошенные загрузки не копятся.
onBootstrap((event) => {
  event.next();
  const tempDir = $os.getenv('TMPDIR');

  if (tempDir) {
    $os.mkdirAll(tempDir, 0o700);
  }
});

routerAdd(
  'POST',
  '/api/bounce/backup',
  (event) => {
    const backup = require(`${__hooks}/lib/backup.js`);
    backup.requireAdmin(event.app, event.auth.id);
    const name = backup.getNewBackupName();
    event.app.createBackup(event.request.context(), name);
    backup.clearBackupsExcept(event.app, name);

    return event.json(200, { name });
  },
  $apis.requireAuth('users')
);

routerAdd('GET', '/api/bounce/backup/{name}', (event) => {
  const backup = require(`${__hooks}/lib/backup.js`);
  const name = event.request.pathValue('name');

  if (!backup.BACKUP_NAME_RE.test(name)) {
    throw new NotFoundError();
  }

  let user = null;
  try {
    user = event.app.findAuthRecordByToken(
      event.request.url.query().get('token'),
      'file'
    );
  } catch (_error) {
    throw new ForbiddenError('Ссылка устарела, скачайте копию заново.');
  }
  backup.requireAdmin(event.app, user.id);
  const backups = event.app.newBackupsFilesystem();
  try {
    if (!backups.exists(name)) {
      throw new NotFoundError();
    }

    event.response
      .header()
      .set('Content-Disposition', `attachment; filename="${name}"`);
    backups.serve(event.response, event.request, name, name);
  } finally {
    backups.close();
  }
});

routerAdd(
  'POST',
  '/api/bounce/backup/upload',
  (event) => {
    const backup = require(`${__hooks}/lib/backup.js`);
    backup.requireAdmin(event.app, event.auth.id);
    const files = event.findUploadedFiles('file') || [];
    const file = files[0];

    if (files.length !== 1 || !file) {
      throw new BadRequestError('Нужен один файл копии.');
    }

    const name = backup.getNewBackupName();
    const backups = event.app.newBackupsFilesystem();
    try {
      backups.uploadFile(file, name);
    } finally {
      backups.close();
    }
    backup.clearBackupsExcept(event.app, name);

    return event.json(200, { name });
  },
  $apis.requireAuth('users'),
  // копия с аудио может весить гигабайты
  $apis.bodyLimit(require(`${__hooks}/lib/backup.js`).BACKUP_UPLOAD_LIMIT)
);

routerAdd(
  'POST',
  '/api/bounce/backup/restore',
  (event) => {
    const backup = require(`${__hooks}/lib/backup.js`);
    backup.requireAdmin(event.app, event.auth.id);
    const name = String(event.requestInfo().body.name || '');

    if (!backup.BACKUP_NAME_RE.test(name)) {
      throw new BadRequestError('Неверное имя копии.');
    }

    event.app.restoreBackup(event.request.context(), name);

    return event.json(200, { ok: true });
  },
  $apis.requireAuth('users')
);
