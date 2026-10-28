// Помощники pb_hooks/backup.pb.js: обработчики PocketBase не видят переменные своего файла,
// общее подключается через require.

const NAME = /^bounce-[0-9]{8}-[0-9]{6}\.zip$/;

function requireAdmin(app, id) {
  const me = app.findRecordById('users', id);
  if (!me.getBool('is_admin') || !me.getBool('totp_enabled')) {
    throw new ForbiddenError('Только для главного пользователя.');
  }
}

function newName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `bounce-${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}.zip`;
}

// на сервере остаётся не больше одной копии
function clear(app) {
  const fsys = app.newBackupsFilesystem();
  try {
    for (const obj of fsys.list('')) {
      if (obj) fsys.delete(obj.key);
    }
  } finally {
    fsys.close();
  }
}

module.exports = { NAME, requireAdmin, newName, clear };
