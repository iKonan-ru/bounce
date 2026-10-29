// Размер JPEG по заголовку кадра (маркер SOFn) без декодирования картинки - для проверки
// обложки для релиза в хуках (pb_hooks/release.pb.js) и тестов Node.
//
// read(offset, length) возвращает байты файла с этого места (массив или Uint8Array, у конца
// файла - короче). Читается только нужное: заголовки сегментов, их содержимое пропускается, так
// что большие EXIF, XMP и ICC перед кадром не грузятся в память.

// сегментов до кадра в настоящих файлах - десятки; больше - мусор, дальше не читаем
const MAX_SEGMENTS = 1000;

// SOF0..SOF15, кроме C4 (DHT - таблицы Хаффмана), C8 (JPG - зарезервирован) и CC (DAC)
function isSof(marker) {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

// { width, height } или null, если это не JPEG или кадра нет до начала данных
function jpegSize(read) {
  const soi = read(0, 2);
  if (soi.length < 2 || soi[0] !== 0xff || soi[1] !== 0xd8) return null;
  let pos = 2;
  for (let n = 0; n < MAX_SEGMENTS; n++) {
    let b = read(pos, 1);
    if (b.length < 1 || b[0] !== 0xff) return null;
    // перед маркером может стоять сколько угодно байтов-заполнителей 0xFF
    let marker = 0xff;
    while (marker === 0xff) {
      pos += 1;
      b = read(pos, 1);
      if (b.length < 1) return null;
      marker = b[0];
    }
    pos += 1;
    // маркеры без длины и содержимого: TEM и RST0..RST7
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    // конец картинки или начало сжатых данных - кадра так и не было; 0x00 маркером не бывает
    if (marker === 0xd9 || marker === 0xda || marker === 0x00) return null;
    // длина сегмента (2 байта, вместе с собой); у кадра дальше точность, высота и ширина
    const seg = read(pos, isSof(marker) ? 7 : 2);
    if (seg.length < 2) return null;
    const len = (seg[0] << 8) | seg[1];
    if (len < 2) return null;
    if (isSof(marker)) {
      if (len < 7 || seg.length < 7) return null;
      return { width: (seg[5] << 8) | seg[6], height: (seg[3] << 8) | seg[4] };
    }
    pos += len;
  }
  return null;
}

module.exports = { jpegSize, isSof };
