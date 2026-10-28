// Правила релиза песни (pb_hooks/release.pb.js). Дата релиза хранится полднем UTC; "сегодня" -
// по поясу сервера (TZ в compose.yml).

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// день релиза наступил (или прошёл)
function releaseDue(song) {
  const day = song.getString('target_release').slice(0, 10);
  return day !== '' && day <= today();
}

// отправленная песня после дня релиза - выпущена; выпущенная с перенесённой вперёд датой - снова
// отправлена
function adjustStatus(song) {
  const st = song.getString('status');
  if (st === 'sent' && releaseDue(song)) song.set('status', 'released');
  if (st === 'released' && !releaseDue(song)) song.set('status', 'sent');
}

// на лейбл - только с текстом и обложкой для релиза
function checkSendable(song) {
  const st = song.getString('status');
  if (st !== 'sent' && st !== 'released') return;
  const missing = [];
  if (!song.getString('lyrics').trim()) missing.push('текст песни');
  if (!song.getString('release_cover')) missing.push('обложка для релиза');
  if (missing.length > 0) {
    throw new BadRequestError(`Для отправки на лейбл нужны: ${missing.join(', ')}.`, {
      status: new ValidationError('not_sendable', missing.join(', ')),
    });
  }
}

module.exports = { today, releaseDue, adjustStatus, checkSendable };
