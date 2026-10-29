// TOTP (RFC 6238) для хуков PocketBase и тестов Node: SHA-1, HMAC, base32 на чистом JS.
// В JSVM PocketBase нет HMAC-SHA1, а приложения-аутентификаторы понимают только его.
//
// В SHA-1 переменные a, b, c, d, e, f, k, w названы как в RFC 3174: так алгоритм сверяется со
// стандартом построчно.

/** Алфавит base32 (RFC 4648) */
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Шаг кода, секунд */
const PERIOD = 30;

/** Цифр в коде */
const DIGITS = 6;

/** Допуск на расхождение часов телефона и сервера: соседний шаг в обе стороны */
const WINDOW = 1;

/** Битов в символе base32 */
const BASE32_BITS = 5;

/** Битов в байте */
const BYTE_BITS = 8;

/** Маска байта */
const BYTE_MASK = 0xff;

/** Размер блока SHA-1 и ключа HMAC, байт */
const BLOCK_SIZE = 64;

/** Место длины сообщения в последнем блоке SHA-1 */
const LENGTH_OFFSET = 56;

/** Слов в расписании SHA-1 */
const SCHEDULE_WORDS = 80;

/** Слов в блоке SHA-1 */
const BLOCK_WORDS = 16;

/** Начальные значения SHA-1 */
const SHA1_INIT = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];

/** Константы раундов SHA-1: по 20 раундов на каждую */
const SHA1_ROUND_CONSTANTS = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];

/** Раундов SHA-1 на одну константу */
const ROUNDS_PER_CONSTANT = 20;

/** Внутренняя и внешняя маски HMAC */
const HMAC_INNER_PAD = 0x36;
const HMAC_OUTER_PAD = 0x5c;

/** Байтов счётчика HOTP */
const COUNTER_BYTES = 8;

/** Код из шести цифр */
const CODE_RE = /^\d{6}$/;

/** Пробелы внутри кода и ключа */
const WHITESPACE_RE = /\s+/g;

/** Знаки "=" в конце ключа base32 */
const BASE32_PADDING_RE = /=+$/;

/** Байты из ключа base32 */
function decodeBase32(input) {
  const clean = String(input)
    .toUpperCase()
    .replace(BASE32_PADDING_RE, '')
    .replace(WHITESPACE_RE, '');
  const bytes = [];
  let bits = 0;
  let value = 0;
  for (const char of clean) {
    const charIndex = BASE32.indexOf(char);

    if (charIndex < 0) {
      throw new Error('не base32');
    }

    value = (value << BASE32_BITS) | charIndex;
    bits += BASE32_BITS;

    if (bits >= BYTE_BITS) {
      bytes.push((value >>> (bits - BYTE_BITS)) & BYTE_MASK);
      bits -= BYTE_BITS;
    }
  }

  return bytes;
}

/** Циклический сдвиг 32-битного числа влево на count битов */
function rotateLeft(value, count) {
  return ((value << count) | (value >>> (32 - count))) >>> 0;
}

/** Четыре байта 32-битного числа, старший первым */
function getWordBytes(word) {
  return [
    (word >>> 24) & BYTE_MASK,
    (word >>> 16) & BYTE_MASK,
    (word >>> 8) & BYTE_MASK,
    word & BYTE_MASK,
  ];
}

/** Сообщение SHA-1 с дополнением и длиной в конце */
function padMessage(bytes) {
  const message = bytes.slice();
  const bitLength = bytes.length * BYTE_BITS;
  message.push(0x80);
  while (message.length % BLOCK_SIZE !== LENGTH_OFFSET) {
    message.push(0);
  }
  // длина сообщения - 64 бита big-endian; старшие 32 бита для наших длин всегда 0
  message.push(0, 0, 0, 0, ...getWordBytes(bitLength));

  return message;
}

/** Группа раундов SHA-1 с выбором (0-19) */
const CHOOSE_ROUND_GROUP = 0;

/** Группа раундов SHA-1 с большинством (40-59) */
const MAJORITY_ROUND_GROUP = 2;

/** Функция раунда SHA-1: выбор, большинство или чётность */
function getRoundFunction(round, b, c, d) {
  const roundGroup = Math.floor(round / ROUNDS_PER_CONSTANT);

  if (roundGroup === CHOOSE_ROUND_GROUP) {
    return (b & c) | (~b & d);
  }

  if (roundGroup === MAJORITY_ROUND_GROUP) {
    return (b & c) | (b & d) | (c & d);
  }

  return b ^ c ^ d;
}

/** Расписание слов SHA-1 для блока с начала offset */
function getSchedule(message, offset) {
  const w = new Array(SCHEDULE_WORDS);
  for (let index = 0; index < BLOCK_WORDS; index++) {
    const at = offset + index * 4;
    w[index] =
      ((message[at] << 24) |
        (message[at + 1] << 16) |
        (message[at + 2] << 8) |
        message[at + 3]) >>>
      0;
  }
  for (let index = BLOCK_WORDS; index < SCHEDULE_WORDS; index++) {
    w[index] = rotateLeft(
      w[index - 3] ^ w[index - 8] ^ w[index - 14] ^ w[index - 16],
      1
    );
  }

  return w;
}

/** SHA-1 от массива байтов: 20 байтов */
function getSha1(bytes) {
  const message = padMessage(bytes);
  const hash = SHA1_INIT.slice();
  for (let offset = 0; offset < message.length; offset += BLOCK_SIZE) {
    const w = getSchedule(message, offset);
    let [a, b, c, d, e] = hash;
    for (let round = 0; round < SCHEDULE_WORDS; round++) {
      const f = getRoundFunction(round, b, c, d);
      const k = SHA1_ROUND_CONSTANTS[Math.floor(round / ROUNDS_PER_CONSTANT)];
      const temp = (rotateLeft(a, 5) + f + e + k + w[round]) >>> 0;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = temp;
    }
    const roundResult = [a, b, c, d, e];
    for (let index = 0; index < hash.length; index++) {
      hash[index] = (hash[index] + roundResult[index]) >>> 0;
    }
  }

  return hash.flatMap(getWordBytes);
}

/** HMAC-SHA1 (RFC 2104) */
function getHmacSha1(key, message) {
  const paddedKey = key.length > BLOCK_SIZE ? getSha1(key) : key.slice();
  while (paddedKey.length < BLOCK_SIZE) {
    paddedKey.push(0);
  }
  const inner = paddedKey.map((byte) => byte ^ HMAC_INNER_PAD).concat(message);
  const outer = paddedKey
    .map((byte) => byte ^ HMAC_OUTER_PAD)
    .concat(getSha1(inner));

  return getSha1(outer);
}

/** Код для шага времени (HOTP, RFC 4226) */
function getHotp(keyBytes, counter) {
  const message = new Array(COUNTER_BYTES).fill(0);
  let rest = counter;
  for (let index = COUNTER_BYTES - 1; index >= 0; index--) {
    message[index] = rest & BYTE_MASK;
    rest = Math.floor(rest / 256);
  }
  const mac = getHmacSha1(keyBytes, message);
  const offset = mac[19] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3];

  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/** Шаг времени для момента unixSeconds */
function getStepAt(unixSeconds) {
  return Math.floor(unixSeconds / PERIOD);
}

/** Код по ключу base32 в момент unixSeconds */
function getCode(secretBase32, unixSeconds) {
  return getHotp(decodeBase32(secretBase32), getStepAt(unixSeconds));
}

/**
 * Шаг, которому соответствует код, или -1
 *
 * Код не принимается повторно: шаг должен быть больше lastStep (последнего принятого)
 */
function getVerifiedStep(secretBase32, input, unixSeconds, lastStep) {
  const clean = String(input).replace(WHITESPACE_RE, '');

  if (!CODE_RE.test(clean)) {
    return -1;
  }

  const key = decodeBase32(secretBase32);
  const currentStep = getStepAt(unixSeconds);
  const minStep = lastStep || 0;
  for (let drift = -WINDOW; drift <= WINDOW; drift++) {
    const step = currentStep + drift;

    if (step > minStep && getHotp(key, step) === clean) {
      return step;
    }
  }

  return -1;
}

/** Адрес otpauth:// для QR-кода в приложении-аутентификаторе */
function getOtpauthUri(secretBase32, account, issuer) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = [
    `secret=${secretBase32}`,
    `issuer=${encodeURIComponent(issuer)}`,
    'algorithm=SHA1',
    `digits=${DIGITS}`,
    `period=${PERIOD}`,
  ];

  return `otpauth://totp/${label}?${params.join('&')}`;
}

module.exports = {
  BASE32,
  decodeBase32,
  getSha1,
  getHmacSha1,
  getHotp,
  getCode,
  getVerifiedStep,
  getOtpauthUri,
  getStepAt,
};
