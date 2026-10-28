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

const SENT = ['sent', 'released'];

// на лейбл - только с датой релиза, текстом и обложкой для релиза. Дату проверяем при отправке
// и при попытке её убрать: песни, отправленные раньше без даты, правятся как прежде.
function checkSendable(song) {
  const st = song.getString('status');
  if (!SENT.includes(st)) return;
  const missing = [];
  const before = song.original();
  const wasSent = SENT.includes(before.getString('status'));
  const hadDate = before.getString('target_release') !== '';
  if (!song.getString('target_release') && (!wasSent || hadDate)) missing.push('дата релиза');
  if (!song.getString('lyrics').trim()) missing.push('текст песни');
  // в запросе с новым файлом поле хранит ещё не сохранённый файл, а не имя: getString пустой
  const cover = song.get('release_cover');
  if (cover === null || cover === undefined || cover === '') missing.push('обложка для релиза');
  if (missing.length > 0) {
    throw new BadRequestError(`Для отправки на лейбл нужны: ${missing.join(', ')}.`, {
      status: new ValidationError('not_sendable', missing.join(', ')),
    });
  }
}

module.exports = { today, releaseDue, adjustStatus, checkSendable };
