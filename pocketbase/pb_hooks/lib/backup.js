// Помощники pb_hooks/backup.pb.js: обработчики PocketBase не видят переменные своего файла,
// общее подключается через require.

/**
 * Имя копии: bounce-ГГГГММДД-ччммсс-ммм.zip
 *
 * UTC, с миллисекундами: две копии за одну секунду - разные файлы. Копии прежнего вида, без
 * миллисекунд, тоже восстанавливаются
 */
const BACKUP_NAME_RE = /^bounce-[0-9]{8}-[0-9]{6}(-[0-9]{3})?\.zip$/;

/** Предел размера загружаемой копии: копия с аудио может весить гигабайты */
const BACKUP_UPLOAD_LIMIT = 20 * 1024 * 1024 * 1024;

/** Число двумя цифрами: 5 -> "05" */
function padTwoDigits(value) {
  return String(value).padStart(2, '0');
}

/** Только главный пользователь с подключённой 2FA; иначе - отказ */
function requireAdmin(app, userId) {
  const me = app.findRecordById('users', userId);
  const isAdmin = me.getBool('is_admin') && me.getBool('totp_enabled');

  if (!isAdmin) {
    throw new ForbiddenError('Только для главного пользователя.');
  }
}

/** Имя новой копии по текущему времени UTC */
function getNewBackupName() {
  const now = new Date();
  const day = [
    now.getUTCFullYear(),
    padTwoDigits(now.getUTCMonth() + 1),
    padTwoDigits(now.getUTCDate()),
  ];
  const time = [
    padTwoDigits(now.getUTCHours()),
    padTwoDigits(now.getUTCMinutes()),
    padTwoDigits(now.getUTCSeconds()),
  ];
  const milliseconds = String(now.getUTCMilliseconds()).padStart(3, '0');

  return `bounce-${day.join('')}-${time.join('')}-${milliseconds}.zip`;
}

/**
 * На сервере остаётся одна копия - keep, только что собранная или загруженная
 *
 * Прежние удаляются после того, как новая готова: сбой при сборке не оставит сервер без копии
 */
function clearBackupsExcept(app, keep) {
  const backups = app.newBackupsFilesystem();
  try {
    for (const file of backups.list('')) {
      if (file && file.key !== keep) {
        backups.delete(file.key);
      }
    }
  } finally {
    backups.close();
  }
}

module.exports = {
  BACKUP_NAME_RE,
  BACKUP_UPLOAD_LIMIT,
  requireAdmin,
  getNewBackupName,
  clearBackupsExcept,
};
