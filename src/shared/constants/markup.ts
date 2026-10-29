/** Пунктуация в конце ссылки: остаётся текстом */
export const URL_TAIL_RE = /[.,;:!?'")\]\u00BB]+$/;

/** Буква или цифра: граница слова для правил с hasWordBoundary */
export const WORD_CHAR_RE = /[\p{L}\p{N}]/u;

/** Строка маркированного списка */
export const UL_LINE_RE = /^\s*[-*\u2022]\s+(.*)$/;

/** Строка нумерованного списка */
export const OL_LINE_RE = /^\s*(\d{1,3})[.)]\s+(.*)$/;

/** Строка цитаты */
export const QUOTE_LINE_RE = /^\s*>\s?(.*)$/;

/** Строки, с которых начинается новый блок */
export const BLOCK_START_RES: readonly RegExp[] = [
  UL_LINE_RE,
  OL_LINE_RE,
  QUOTE_LINE_RE,
];

/** Переводы строк Windows */
export const CRLF_RE = /\r\n/g;

/** Адрес без протокола начинается с www. */
export const WWW_PREFIX = 'www.';

/** Разрешённые протоколы ссылок */
export const SAFE_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);

/** Начало домена www. */
export const WWW_HOST_RE = /^www\./;

/** Длинная часть пути в подписи ссылки обрезается */
export const LINK_SEGMENT_MAX = 18;

/** Разделитель сервиса и вида страницы в подписи ссылки */
export const LINK_KIND_SEPARATOR = ' \u00B7 ';

/** Что это за страница на YouTube по первой части пути */
export const YOUTUBE_KIND: Record<string, string> = {
  shorts: 'Shorts',
  playlist: 'плейлист',
};

/** Что это за страница в Spotify */
export const SPOTIFY_KIND: Record<string, string> = {
  track: 'трек',
  album: 'альбом',
  playlist: 'плейлист',
  artist: 'артист',
};

/** Что это за страница в Яндекс Музыке */
export const YANDEX_MUSIC_KIND: Record<string, string> = {
  album: 'альбом',
  artist: 'артист',
};

/** Что это за страница в Instagram; остальное - как есть */
export const INSTAGRAM_KIND: Record<string, string> = {
  reel: 'Reels',
  reels: 'Reels',
  p: 'пост',
};

/** Сколько частей пути GitHub показывать: владелец и репозиторий */
export const GITHUB_PATH_PARTS = 2;
