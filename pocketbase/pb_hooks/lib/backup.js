// Помощники pb_hooks/backup.pb.js: обработчики PocketBase не видят переменные своего файла,
// общее подключается через require.

// bounce-ГГГГММДД-ччммсс-ммм.zip (UTC, с миллисекундами: две копии за одну секунду - разные
// файлы); копии прежнего вида, без миллисекунд, тоже восстанавливаются
const NAME = /^bounce-[0-9]{8}-[0-9]{6}(-[0-9]{3})?\.zip$/;

function requireAdmin(app, id) {
  const me = app.findRecordById('users', id);
  if (!me.getBool('is_admin') || !me.getBool('totp_enabled')) {
    throw new ForbiddenError('Только для главного пользователя.');
  }
}

function newName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
  return `bounce-${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}-${ms}.zip`;
}

// на сервере остаётся одна копия - keep, только что собранная или загруженная; прежние
// удаляются после того, как новая готова: сбой при сборке не оставит сервер без копии
function clearExcept(app, keep) {
  const fsys = app.newBackupsFilesystem();
  try {
    for (const obj of fsys.list('')) {
      if (obj && obj.key !== keep) fsys.delete(obj.key);
    }
  } finally {
    fsys.close();
  }
}

module.exports = { NAME, requireAdmin, newName, clearExcept };
