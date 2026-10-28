// TOTP (RFC 6238) для хуков PocketBase и тестов Node: SHA-1, HMAC, base32 на чистом JS.
// В JSVM PocketBase нет HMAC-SHA1, а приложения-аутентификаторы понимают только его.

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIOD = 30;
const DIGITS = 6;
// допуск на расхождение часов телефона и сервера: соседний шаг в обе стороны
const WINDOW = 1;

function base32Decode(input) {
  const clean = String(input).toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  const out = [];
  let bits = 0;
  let value = 0;
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32.indexOf(clean[i]);
    if (idx < 0) throw new Error('не base32');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return out;
}

function rotl(x, n) {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}

function sha1(bytes) {
  const msg = bytes.slice();
  const bitLen = bytes.length * 8;
  msg.push(0x80);
  while (msg.length % 64 !== 56) msg.push(0);
  // длина сообщения - 64 бита big-endian; старшие 32 бита для наших длин всегда 0
  msg.push(0, 0, 0, 0);
  msg.push((bitLen >>> 24) & 0xff, (bitLen >>> 16) & 0xff, (bitLen >>> 8) & 0xff, bitLen & 0xff);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const w = new Array(80);
  for (let off = 0; off < msg.length; off += 64) {
    for (let i = 0; i < 16; i++) {
      const j = off + i * 4;
      w[i] = ((msg[j] << 24) | (msg[j + 1] << 16) | (msg[j + 2] << 8) | msg[j + 3]) >>> 0;
    }
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let i = 0; i < 80; i++) {
      let f;
      let k;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const t = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = t;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  const out = [];
  for (const h of [h0, h1, h2, h3, h4]) {
    out.push((h >>> 24) & 0xff, (h >>> 16) & 0xff, (h >>> 8) & 0xff, h & 0xff);
  }
  return out;
}

function hmacSha1(key, message) {
  const k = key.length > 64 ? sha1(key) : key.slice();
  while (k.length < 64) k.push(0);
  const inner = k.map((b) => b ^ 0x36).concat(message);
  const outer = k.map((b) => b ^ 0x5c).concat(sha1(inner));
  return sha1(outer);
}

// код для шага времени (HOTP, RFC 4226)
function hotp(keyBytes, counter) {
  const msg = [0, 0, 0, 0, 0, 0, 0, 0];
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const mac = hmacSha1(keyBytes, msg);
  const off = mac[19] & 0x0f;
  const bin = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  return String(bin % 10 ** DIGITS).padStart(DIGITS, '0');
}

function stepAt(unixSeconds) {
  return Math.floor(unixSeconds / PERIOD);
}

function code(secretBase32, unixSeconds) {
  return hotp(base32Decode(secretBase32), stepAt(unixSeconds));
}

// Шаг, которому соответствует код, или -1. Код не принимается повторно: шаг должен быть
// больше lastStep (последнего принятого).
function verify(secretBase32, input, unixSeconds, lastStep) {
  const clean = String(input).replace(/\s+/g, '');
  if (!/^\d{6}$/.test(clean)) return -1;
  const key = base32Decode(secretBase32);
  const now = stepAt(unixSeconds);
  for (let d = -WINDOW; d <= WINDOW; d++) {
    const s = now + d;
    if (s > (lastStep || 0) && hotp(key, s) === clean) return s;
  }
  return -1;
}

// otpauth:// для QR-кода в приложении-аутентификаторе
function uri(secretBase32, account, issuer) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`;
}

module.exports = { BASE32, base32Decode, sha1, hmacSha1, hotp, code, verify, uri, stepAt };
