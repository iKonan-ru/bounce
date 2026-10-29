/** Теги MP3 */
export interface Id3Tags {
  title?: string;
  artist?: string;
  album?: string;
  picture?: Id3Picture;
}

/** Обложка из тегов */
export interface Id3Picture {
  mime: string;
  data: Uint8Array;
}

/** Кодировка текста в кадре ID3 (первый байт кадра) */
export enum TextEncoding {
  /** ISO-8859-1; в русских файлах почти всегда на деле cp1251 */
  Latin1 = 0,
  /** UTF-16 с меткой порядка байтов */
  Utf16 = 1,
  /** UTF-16, старший байт первым, без метки */
  Utf16Be = 2,
  /** UTF-8 */
  Utf8 = 3,
}

/** Тип картинки и где начинается её описание */
export interface PictureHead {
  mime: string;
  descriptionStart: number;
}
