import { ClientResponseError } from 'pocketbase';
import { describe, expect, it } from 'vitest';
import { PostAnchor, getOffsetLabel, getPostDate } from '@/entities/post';
import {
  getServiceByUrl,
  getShortUrl,
  MUSIC_SERVICES,
  normalizeUrl,
} from '@/entities/service';
import {
  getKeyHint,
  getKeyLabel,
  parseKey,
  getLyricsParts,
  getPlainLyrics,
  insertTag,
  numberVerses,
  checkIsReleaseDue,
  getReleaseMissing,
  getSongStatus,
  getMainCover,
  getTitleFromNote,
} from '@/entities/song';
import {
  type SongStage,
  SongStatus,
  type SongWithStages,
  StageStatus,
} from '@/entities/song';
import { type Task } from '@/entities/task';
import { getDoneTasks, getPlanItems, groupPlanItems } from '@/lib/plan';
import { checkIsNetworkError, Collections } from '@/shared/api';
import type { FileNameString, IsoAutoDateString } from '@/shared/api';
import { MentionPartKind, Bucket } from '@/shared/types';
import {
  convertDayToPbDate,
  convertPbDateToDay,
  getMatchingPeople,
  getMentionedIds,
  getMentionedUsernames,
  getMentionQuery,
  insertMention,
  splitMentions,
  getBucket,
  getNextPosition,
  moveItemById,
} from '@/shared/utils';

/** Элемент списка с id */
interface WithId {
  id: string;
}

/** Ширина числа в дате: месяц и день - две цифры */
const DATE_PART_LENGTH = 2;

/** Сегодня в тестах плана: 28 октября 2026, 15:00 */
const PLAN_TODAY = new Date(2026, 9, 28, 15, 0);

/** Id элементов списка по порядку */
function getIds(list: readonly WithId[]): string[] {
  return list.map((entry) => entry.id);
}

/** Число в дате с ведущим нулём */
function padDatePart(part: number): string {
  return String(part).padStart(DATE_PART_LENGTH, '0');
}

/** Срок в формате PocketBase (полдень UTC) через offset дней от PLAN_TODAY */
function getPlanDay(offset: number): string {
  const date = new Date(2026, 9, 28 + offset);
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());

  return `${date.getFullYear()}-${month}-${day} 12:00:00.000Z`;
}

/** Отметка времени PocketBase - особый вид строки; для образцов годится любая непустая */
function checkIsStamp(value: string): value is IsoAutoDateString {
  return value.length > 0;
}

/** Имя файла PocketBase - особый вид строки; для образцов годится любая, и пустая */
function checkIsFileName(value: string): value is FileNameString {
  return value.length >= 0;
}

/** Строка как отметка времени PocketBase */
function toStamp(value: string): IsoAutoDateString {
  if (!checkIsStamp(value)) {
    throw new Error('нет образцов');
  }

  return value;
}

/** Строка как имя файла PocketBase */
function toFileName(value: string): FileNameString {
  if (!checkIsFileName(value)) {
    throw new Error('нет образцов');
  }

  return value;
}

/** Отметка создания и правки образцов */
const SAMPLE_STAMP = toStamp('2026-10-01 10:00:00.000Z');

/** Пустое поле файла */
const NO_FILE = toFileName('');

/** Общие поля записей-образцов */
const BASE_FIELDS = {
  collectionId: 'c',
  created: SAMPLE_STAMP,
  updated: SAMPLE_STAMP,
};

/** Этап песни s, не начатый и без срока; extra - отличия от него */
function createStage(id: string, extra: Partial<SongStage>): SongStage {
  return {
    ...BASE_FIELDS,
    collectionName: Collections.SongStages,
    id,
    song: 's',
    title: id,
    position: 0,
    status: StageStatus.not_started,
    deadline: '',
    assignees: [],
    substeps: [],
    ...extra,
  };
}

/** Песня с этим статусом и этапами */
function createSong(status: SongStatus, stages: SongStage[]): SongWithStages {
  return {
    ...BASE_FIELDS,
    collectionName: Collections.Songs,
    id: `s-${status}`,
    project: 'p',
    title: status,
    status,
    bandlink: '',
    bpm: 0,
    covers: [],
    key: '',
    lyrics: '',
    main_cover: '',
    position: 0,
    release_cover: NO_FILE,
    release_audio: NO_FILE,
    release_audio_name: '',
    target_release: '',
    expand: { song_stages_via_song: stages },
  };
}

/** Открытая задача без срока; extra - отличия от неё */
function createTask(id: string, extra: Partial<Task>): Task {
  return {
    ...BASE_FIELDS,
    collectionName: Collections.Tasks,
    id,
    project: 'p',
    title: id,
    author: 'u0',
    done: false,
    done_at: '',
    due: '',
    assignees: [],
    song: '',
    ...extra,
  };
}

/** Тональность в привычной записи или null, если не разобрать */
function normalizeKey(raw: string): string | null {
  const songKey = parseKey(raw);

  if (!songKey) {
    return null;
  }

  return getKeyLabel(songKey);
}

/** Id музыкального сервиса по адресу (адрес можно без https) */
function getServiceId(url: string): string | undefined {
  const normalizedUrl = normalizeUrl(url) ?? '';

  return getServiceByUrl(MUSIC_SERVICES, normalizedUrl)?.id;
}

describe('lyricsParts', () => {
  it('делит текст на части по [Заголовкам]', () => {
    expect(getLyricsParts('[Куплет 1]\nраз\nдва\n\n[Припев]\nтри\n')).toEqual([
      { title: 'Куплет 1', lines: ['раз', 'два'] },
      { title: 'Припев', lines: ['три'] },
    ]);
  });

  it('текст без разметки - одна часть без заголовка', () => {
    expect(getLyricsParts('\nстрока\n\n')).toEqual([
      { title: '', lines: ['строка'] },
    ]);
  });
});

describe('arrayMoveById', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  it('элемент встаёт на место другого', () => {
    expect(getIds(moveItemById(items, 'c', 'a'))).toEqual(['c', 'a', 'b']);
    expect(getIds(moveItemById(items, 'a', 'c'))).toEqual(['b', 'c', 'a']);
  });
  it('неизвестный id ничего не меняет', () => {
    expect(getIds(moveItemById(items, 'x', 'a'))).toEqual(['a', 'b', 'c']);
  });
  it('новая позиция - в конце', () => {
    expect(
      getNextPosition([
        { id: 'a', position: 0 },
        { id: 'b', position: 4 },
      ])
    ).toBe(5);
    expect(getNextPosition([])).toBe(0);
  });
});

describe('titleFromNote', () => {
  it('первая строка заметки', () => {
    expect(getTitleFromNote('  Баллада про поезд\nв 6/8  ')).toBe(
      'Баллада про поезд'
    );
    expect(getTitleFromNote('')).toBe('');
    expect(getTitleFromNote('x'.repeat(100))).toHaveLength(82);
  });
});

describe('mainCover', () => {
  it('выбранная обложка, иначе первая', () => {
    expect(
      getMainCover({ covers: ['a.png', 'b.png'], main_cover: 'b.png' })
    ).toBe('b.png');
    expect(
      getMainCover({ covers: ['a.png', 'b.png'], main_cover: 'gone.png' })
    ).toBe('a.png');
    expect(getMainCover({ covers: [], main_cover: '' })).toBeUndefined();
  });
});

describe('даты календаря', () => {
  it('день из календаря хранится полднем UTC и читается тем же днём', () => {
    const stored = convertDayToPbDate(new Date(2026, 11, 12));
    expect(stored).toBe('2026-12-12 12:00:00.000Z');
    expect(convertPbDateToDay(stored)?.getDate()).toBe(12);
    expect(convertPbDateToDay('')).toBeUndefined();
  });
});

describe('isNetworkError', () => {
  it('обрыв сети - да, ответ сервера - нет', () => {
    expect(checkIsNetworkError(new ClientResponseError({ status: 0 }))).toBe(
      true
    );
    expect(checkIsNetworkError(new Error('сеть недоступна'))).toBe(true);
    expect(checkIsNetworkError(new ClientResponseError({ status: 400 }))).toBe(
      false
    );
  });
});

describe('релиз', () => {
  const now = new Date(2026, 9, 28, 15);
  it('день релиза наступил - в сам день и после', () => {
    expect(checkIsReleaseDue('2026-10-28 12:00:00.000Z', now)).toBe(true);
    expect(checkIsReleaseDue('2026-10-29 12:00:00.000Z', now)).toBe(false);
    expect(checkIsReleaseDue('', now)).toBe(false);
  });
  it('отправленная песня после даты показывается выпущенной', () => {
    expect(
      getSongStatus({
        status: SongStatus.sent,
        target_release: '2020-01-01 12:00:00.000Z',
      })
    ).toBe(SongStatus.released);
    expect(
      getSongStatus({
        status: SongStatus.done,
        target_release: '2020-01-01 12:00:00.000Z',
      })
    ).toBe(SongStatus.done);
  });
  it('для отправки нужны дата релиза, текст и обложка для релиза', () => {
    expect(getReleaseMissing({ lyrics: ' ', release_cover: '' })).toEqual([
      'дата релиза',
      'текст песни',
      'обложка для релиза',
    ]);
  });
});

describe('метки текста песни', () => {
  it('куплеты без номера нумеруются, если их больше одного', () => {
    const parts = getLyricsParts(
      '[Куплет]\nа\n[Припев]\nб\n[Куплет]\nв\n[Куплет 7]\nг'
    );
    expect(numberVerses(parts).map((part) => part.title)).toEqual([
      'Куплет 1',
      'Припев',
      'Куплет 2',
      'Куплет 7',
    ]);
    const singleVerse = numberVerses(getLyricsParts('[Куплет]\nа'));
    expect(singleVerse.map((part) => part.title)).toEqual(['Куплет']);
  });

  it('копия текста - без меток, части через пустую строку', () => {
    expect(
      getPlainLyrics('[Куплет]\nраз\nдва\n\n\n[Припев]\n\nтри\n[Соло]\n')
    ).toBe('раз\nдва\n\nтри');
  });

  it('метка встаёт отдельной строкой после пустой строки', () => {
    expect(insertTag({ value: '', start: 0, end: 0 }, 'Куплет')).toEqual({
      value: '[Куплет]\n',
      start: 9,
      end: 9,
    });
    const text = 'раз\nдва';
    const inserted = insertTag(
      { value: text, start: text.length, end: text.length },
      'Припев'
    );
    expect(inserted.value).toBe('раз\nдва\n\n[Припев]\n');
    expect(inserted.start).toBe(inserted.value.length);
    expect(insertTag({ value: 'раз\n', start: 4, end: 4 }, 'Бридж').value).toBe(
      'раз\n\n[Бридж]\n'
    );
  });
});

describe('план', () => {
  it('срок раскладывается по группам', () => {
    expect(getBucket('', PLAN_TODAY)).toBe(Bucket.None);
    expect(getBucket(getPlanDay(-1), PLAN_TODAY)).toBe(Bucket.Overdue);
    expect(getBucket(getPlanDay(0), PLAN_TODAY)).toBe(Bucket.Today);
    expect(getBucket(getPlanDay(1), PLAN_TODAY)).toBe(Bucket.Tomorrow);
    expect(getBucket(getPlanDay(6), PLAN_TODAY)).toBe(Bucket.Week);
    expect(getBucket(getPlanDay(7), PLAN_TODAY)).toBe(Bucket.Later);
  });

  it('в план - начатые, со сроком или с исполнителем этапы песен в работе и открытые задачи', () => {
    const items = getPlanItems(
      [
        createSong(SongStatus.active, [
          createStage('ждёт', {}),
          createStage('в работе', { status: StageStatus.in_progress }),
          createStage('со сроком', { deadline: getPlanDay(2) }),
          createStage('чей-то', { assignees: ['u1', 'u2'] }),
          createStage('готов', {
            status: StageStatus.done,
            deadline: getPlanDay(0),
          }),
          createStage('пропущен', {
            status: StageStatus.skipped,
            assignees: ['u1'],
          }),
        ]),
        createSong(SongStatus.paused, [
          createStage('на паузе', { status: StageStatus.in_progress }),
        ]),
      ],
      [createTask('открытая', {}), createTask('закрытая', { done: true })]
    );
    expect(getIds(items)).toEqual([
      'в работе',
      'со сроком',
      'чей-то',
      'открытая',
    ]);
    const myTasks = [
      createTask('a', { assignees: ['u2', 'u1'] }),
      createTask('b', {}),
    ];
    expect(getPlanItems([], myTasks, 'u1')).toHaveLength(1);
  });

  it('группы по порядку сроков, внутри - по дате', () => {
    const groups = groupPlanItems(
      getPlanItems(
        [],
        [
          createTask('без срока', {}),
          createTask('через 3', { due: getPlanDay(3) }),
          createTask('вчера', { due: getPlanDay(-1) }),
          createTask('через 2', { due: getPlanDay(2) }),
          createTask('сегодня', { due: getPlanDay(0) }),
        ]
      ),
      PLAN_TODAY
    );
    expect(groups.map((group) => [group.bucket, getIds(group.items)])).toEqual([
      [Bucket.Overdue, ['вчера']],
      [Bucket.Today, ['сегодня']],
      [Bucket.Week, ['через 2', 'через 3']],
      [Bucket.None, ['без срока']],
    ]);
  });

  it('выполненные - сначала последние', () => {
    const list = getDoneTasks([
      createTask('a', { done: true, done_at: '2026-10-01 10:00:00.000Z' }),
      createTask('b', { done: true, done_at: '2026-10-02 10:00:00.000Z' }),
      createTask('c', {}),
    ]);
    expect(getIds(list)).toEqual(['b', 'a']);
  });
});

describe('упоминания', () => {
  const people = [
    { id: '1', username: 'pasha', name: 'Паша Иванов' },
    { id: '2', username: 'konan', name: 'Konan' },
    { id: '3', username: 'k.lena', name: 'Лена' },
  ];

  it('находит логины, но не почту', () => {
    expect(
      getMentionedUsernames('@pasha, глянь с @konan. почта a@example.com')
    ).toEqual(['pasha', 'konan']);
    expect(getMentionedIds('спроси @k.lena и @nobody', people)).toEqual(['3']);
  });

  it('делит текст на части', () => {
    expect(splitMentions('бас @pasha!')).toEqual([
      { kind: MentionPartKind.Text, text: 'бас ' },
      { kind: MentionPartKind.Mention, username: 'pasha' },
      { kind: MentionPartKind.Text, text: '!' },
    ]);
  });

  it('запрос после @ перед курсором - по логину и по имени', () => {
    expect(getMentionQuery('позвонить @па', 13)).toEqual({
      start: 10,
      query: 'па',
    });
    expect(getMentionQuery('почта a@b', 9)).toBeNull();
    expect(getIds(getMatchingPeople(people, 'па'))).toEqual(['1']);
    expect(getIds(getMatchingPeople(people, 'ив'))).toEqual(['1']);
    expect(getIds(getMatchingPeople(people, 'k'))).toEqual(['2', '3']);
  });

  it('вставка заменяет запрос логином и пробелом', () => {
    expect(insertMention('спроси @па про бас', 7, 10, 'pasha')).toEqual({
      value: 'спроси @pasha про бас',
      caret: 13,
    });
    expect(insertMention('позвонить @па', 10, 13, 'pasha')).toEqual({
      value: 'позвонить @pasha ',
      caret: 17,
    });
  });
});

describe('контент-план', () => {
  const songs = [
    { id: 's1', target_release: '2026-11-20 12:00:00.000Z' },
    { id: 's2', target_release: '' },
  ];

  it('дата публикации - своя или от релиза песни', () => {
    const ownDatePost = {
      anchor: PostAnchor.date,
      date: '2026-11-01 12:00:00.000Z',
      offset: 0,
      song: '',
    };
    expect(getPostDate(ownDatePost, songs)).toBe('2026-11-01 12:00:00.000Z');
    expect(
      getPostDate(
        { anchor: PostAnchor.release, date: '', offset: -7, song: 's1' },
        songs
      )
    ).toBe('2026-11-13 12:00:00.000Z');
    expect(
      getPostDate(
        { anchor: PostAnchor.release, date: '', offset: 3, song: 's2' },
        songs
      )
    ).toBe('');
  });

  it('сдвиг от релиза словами', () => {
    expect(getOffsetLabel(0)).toBe('в день релиза');
    expect(getOffsetLabel(-1)).toBe('за день до релиза');
    expect(getOffsetLabel(1)).toBe('через день после релиза');
    expect(getOffsetLabel(-3)).toBe('за 3 дня до релиза');
    expect(getOffsetLabel(-7)).toBe('за неделю до релиза');
    expect(getOffsetLabel(14)).toBe('через 2 недели после релиза');
    expect(getOffsetLabel(5)).toBe('через 5 дней после релиза');
  });
});

describe('тональность', () => {
  it('разбирает привычные записи и приводит к одному виду', () => {
    expect(normalizeKey('Am')).toBe('Am');
    expect(normalizeKey('a minor')).toBe('Am');
    expect(normalizeKey('F# maj')).toBe('F#');
    expect(normalizeKey('Db')).toBe('C#');
    expect(normalizeKey('Abm')).toBe('G#m');
    expect(normalizeKey('A#m')).toBe('Bbm');
    expect(normalizeKey('ля минор')).toBeNull();
    expect(normalizeKey('H')).toBeNull();
  });
  it('подсказка по-русски', () => {
    expect(getKeyHint({ tonic: 'A', isMinor: true })).toBe('ля минор');
    expect(getKeyHint({ tonic: 'F#', isMinor: false })).toBe('фа-диез мажор');
  });
});

describe('ссылки проекта', () => {
  it('дописывает https и узнаёт сервис по адресу', () => {
    expect(normalizeUrl('music.yandex.ru/artist/1')).toBe(
      'https://music.yandex.ru/artist/1'
    );
    expect(normalizeUrl('просто текст')).toBeNull();
    expect(normalizeUrl('localhost')).toBeNull();
    expect(getServiceId('https://music.yandex.ru/artist/1')).toBe(
      'yandex_music'
    );
    expect(getServiceId('open.spotify.com/artist/x')).toBe('spotify');
    expect(getServiceId('https://www.youtube.com/@band')).toBe('youtube');
    expect(getServiceId('music.youtube.com/channel/x')).toBe('youtube');
    expect(getServiceId('https://zvuk.com/artist/1')).toBe('zvuk');
    expect(getServiceId('https://example.com')).toBeUndefined();
    expect(getShortUrl('https://www.instagram.com/band/')).toBe(
      'instagram.com/band'
    );
  });
});
