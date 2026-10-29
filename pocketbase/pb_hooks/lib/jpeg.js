// Размер JPEG по заголовку кадра (маркер SOFn) без декодирования картинки - для проверки
// обложки для релиза в хуках (pb_hooks/release.pb.js) и тестов Node.
//
// read(offset, length) возвращает байты файла с этого места (массив или Uint8Array, у конца
// файла - короче). Читается только нужное: заголовки сегментов, их содержимое пропускается, так
// что большие EXIF, XMP и ICC перед кадром не грузятся в память.

/** Сегментов до кадра в настоящих файлах - десятки; больше - мусор, дальше не читаем */
const MAX_SEGMENTS = 1000;

/** Начало маркера и байт-заполнитель перед ним */
const MARKER_PREFIX = 0xff;

/** Начало картинки (SOI) */
const START_OF_IMAGE = 0xd8;

/** Конец картинки (EOI) */
const END_OF_IMAGE = 0xd9;

/** Начало сжатых данных (SOS) */
const START_OF_SCAN = 0xda;

/** Маркер без длины: TEM */
const TEMPORARY_MARKER = 0x01;

/** Маркеры без длины: RST0..RST7 */
const RESTART_MIN = 0xd0;
const RESTART_MAX = 0xd7;

/** Маркеры кадра: SOF0..SOF15 */
const SOF_MIN = 0xc0;
const SOF_MAX = 0xcf;

/** Не кадры среди SOF0..SOF15: C4 (DHT - таблицы Хаффмана), C8 (JPG - зарезервирован), CC (DAC) */
const NOT_SOF_MARKERS = [0xc4, 0xc8, 0xcc];

/** Размер длины сегмента */
const LENGTH_SIZE = 2;

/** Заголовок кадра: длина, точность, высота и ширина */
const SOF_HEADER_SIZE = 7;

/** Маркер начинает кадр (SOF0..SOF15, кроме DHT, JPG и DAC) */
function checkIsSof(marker) {
  const isInRange = marker >= SOF_MIN && marker <= SOF_MAX;

  return isInRange && !NOT_SOF_MARKERS.includes(marker);
}

/** Маркер без длины и содержимого: TEM и RST0..RST7 */
function checkIsStandalone(marker) {
  const isRestart = marker >= RESTART_MIN && marker <= RESTART_MAX;

  return marker === TEMPORARY_MARKER || isRestart;
}

/** Конец картинки или начало сжатых данных - кадра так и не было; 0x00 маркером не бывает */
function checkIsFrameMissing(marker) {
  return [END_OF_IMAGE, START_OF_SCAN, 0x00].includes(marker);
}

/** Число из двух байтов, старший первым */
function readUint16(bytes, at) {
  return (bytes[at] << 8) | bytes[at + 1];
}

/** { width, height } или null, если это не JPEG или кадра нет до начала данных */
function getJpegSize(read) {
  const start = read(0, 2);
  const isJpeg =
    start.length >= 2 &&
    start[0] === MARKER_PREFIX &&
    start[1] === START_OF_IMAGE;

  if (!isJpeg) {
    return null;
  }

  let position = 2;
  for (let segment = 0; segment < MAX_SEGMENTS; segment++) {
    let bytes = read(position, 1);

    if (bytes.length === 0 || bytes[0] !== MARKER_PREFIX) {
      return null;
    }

    // перед маркером может стоять сколько угодно байтов-заполнителей 0xFF
    let marker = MARKER_PREFIX;
    while (marker === MARKER_PREFIX) {
      position += 1;
      bytes = read(position, 1);

      if (bytes.length === 0) {
        return null;
      }

      marker = bytes[0];
    }
    position += 1;

    if (checkIsStandalone(marker)) {
      continue;
    }

    if (checkIsFrameMissing(marker)) {
      return null;
    }

    // длина сегмента (2 байта, вместе с собой); у кадра дальше точность, высота и ширина
    const isSof = checkIsSof(marker);
    const header = read(position, isSof ? SOF_HEADER_SIZE : LENGTH_SIZE);

    if (header.length < LENGTH_SIZE) {
      return null;
    }

    const length = readUint16(header, 0);

    if (length < LENGTH_SIZE) {
      return null;
    }

    if (isSof) {
      const isComplete =
        length >= SOF_HEADER_SIZE && header.length >= SOF_HEADER_SIZE;

      if (!isComplete) {
        return null;
      }

      return { width: readUint16(header, 5), height: readUint16(header, 3) };
    }

    position += length;
  }

  return null;
}

module.exports = { getJpegSize, checkIsSof };
