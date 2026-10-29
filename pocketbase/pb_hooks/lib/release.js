// Правила релиза песни (pb_hooks/release.pb.js). Дата релиза хранится полднем UTC; "сегодня" -
// по поясу сервера (TZ в compose.yml).

/** Статус песни: отправлена на лейбл */
const SENT_STATUS = 'sent';

/** Статус песни: выпущена */
const RELEASED_STATUS = 'released';

/** Статусы песни после отправки на лейбл */
const SENT_STATUSES = [SENT_STATUS, RELEASED_STATUS];

/** Длина дня в формате YYYY-MM-DD: первые знаки даты PocketBase */
const DAY_KEY_LENGTH = 10;

/** Обложка для релиза - ровно 3000x3000: так её принимают площадки */
const COVER_SIZE = 3000;

/** Число двумя цифрами: 5 -> "05" */
function padTwoDigits(value) {
  return String(value).padStart(2, '0');
}

/** Сегодня по поясу сервера: YYYY-MM-DD */
function getToday() {
  const now = new Date();

  return `${now.getFullYear()}-${padTwoDigits(now.getMonth() + 1)}-${padTwoDigits(now.getDate())}`;
}

/** День релиза наступил (или прошёл) */
function checkIsReleaseDue(song) {
  const day = song.getString('target_release').slice(0, DAY_KEY_LENGTH);

  return day !== '' && day <= getToday();
}

/** Отправленная песня после дня релиза - выпущена; выпущенная с перенесённой вперёд датой - снова отправлена */
function adjustStatus(song) {
  const status = song.getString('status');
  const isDue = checkIsReleaseDue(song);

  if (status === SENT_STATUS && isDue) {
    song.set('status', RELEASED_STATUS);
  }

  if (status === RELEASED_STATUS && !isDue) {
    song.set('status', SENT_STATUS);
  }
}

/** Файловое поле в запросе: новый файл (ещё не сохранён, getString пустой) или имя прежнего */
function checkHasFile(song, field) {
  const file = song.get(field);

  return [null, undefined, ''].every((empty) => file !== empty);
}

/** Нужна ли дата релиза: при отправке и при попытке её убрать; песни, отправленные раньше без даты, правятся как прежде */
function checkIsDateMissing(song) {
  if (song.getString('target_release')) {
    return false;
  }

  const before = song.original();
  const wasSent = SENT_STATUSES.includes(before.getString('status'));
  const hadDate = before.getString('target_release') !== '';

  return !wasSent || hadDate;
}

/** На лейбл - только с датой релиза, текстом и обложкой для релиза */
function validateSendable(song) {
  if (!SENT_STATUSES.includes(song.getString('status'))) {
    return;
  }

  const missing = [];

  if (checkIsDateMissing(song)) {
    missing.push('дата релиза');
  }

  if (!song.getString('lyrics').trim()) {
    missing.push('текст песни');
  }

  if (!checkHasFile(song, 'release_cover')) {
    missing.push('обложка для релиза');
  }

  if (missing.length === 0) {
    return;
  }

  const missingList = missing.join(', ');
  throw new BadRequestError(`Для отправки на лейбл нужны: ${missingList}.`, {
    status: new ValidationError('not_sendable', missingList),
  });
}

/**
 * Финальную версию трека у отправленной или выпущенной песни можно заменить, но не убрать - как
 * обложку для релиза
 *
 * Сначала отменяют отправку
 */
function validateKeepsAudio(song) {
  if (!SENT_STATUSES.includes(song.getString('status'))) {
    return;
  }

  const hadAudio = song.original().getString('release_audio') !== '';

  if (!hadAudio || checkHasFile(song, 'release_audio')) {
    return;
  }

  throw new BadRequestError(
    'У отправленной на лейбл песни финальную версию можно заменить, но не убрать.',
    {
      release_audio: new ValidationError(
        'release_audio_locked',
        'Нельзя убрать.'
      ),
    }
  );
}

/** Новый файл обложки в запросе (в записи прежнего - имя файла) */
function checkIsNewFile(file) {
  if (!file || typeof file === 'string') {
    return false;
  }

  return Boolean(file.reader);
}

/** Размер JPEG из заголовка файла; читаются только заголовки сегментов */
function readCoverSize(file) {
  const jpeg = require(`${__hooks}/lib/jpeg.js`);
  const reader = file.reader.open();
  try {
    return jpeg.getJpegSize((offset, length) => {
      reader.seek(offset, 0);

      return toBytes(reader, length);
    });
  } finally {
    reader.close();
  }
}

/**
 * Обложка для релиза - JPEG ровно 3000x3000 (так её принимают площадки)
 *
 * Проверяется только новый файл: прежний (в записи - имя файла) проверен при загрузке. Размер -
 * из заголовка JPEG (lib/jpeg.js): читаются только заголовки сегментов, а не весь файл до 40 МБ.
 * Тип файла (только JPEG) PocketBase проверяет сам, но не JPEG здесь тоже отклоняется - понятной
 * причиной
 */
function validateReleaseCover(song) {
  const file = song.get('release_cover');

  if (!checkIsNewFile(file)) {
    return;
  }

  const size = readCoverSize(file);
  const isExactSize =
    size && size.width === COVER_SIZE && size.height === COVER_SIZE;

  if (isExactSize) {
    return;
  }

  const requirement = `Обложка для релиза - JPEG ровно ${COVER_SIZE}x${COVER_SIZE}`;
  let message = `${requirement}.`;

  if (size) {
    message = `${requirement}, у этого файла ${size.width}x${size.height}.`;
  }

  throw new BadRequestError(message, {
    release_cover: new ValidationError('cover_size', message),
  });
}

module.exports = {
  RELEASED_STATUS,
  getToday,
  checkIsReleaseDue,
  adjustStatus,
  validateSendable,
  validateKeepsAudio,
  validateReleaseCover,
};
