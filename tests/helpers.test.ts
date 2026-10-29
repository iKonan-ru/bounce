import { ClientResponseError } from 'pocketbase';
import { describe, expect, it } from 'vitest';
import { fromDay, toDay } from '@/lib/format';
import { formatKey, keyName, parseKey } from '@/lib/keys';
import { insertTag, lyricsParts, numberVerses, plainLyrics } from '@/lib/lyrics';
import {
  insertMention,
  matchPeople,
  mentionedIds,
  mentionedUsernames,
  mentionQuery,
  splitMentions,
} from '@/lib/mentions';
import {
  mainCover,
  releaseDue,
  releaseMissing,
  type SongStage,
  type SongStatus,
  songStatus,
  type Task,
} from '@/lib/model';
import { isNetworkError } from '@/lib/outbox';
import type { FileNameString, IsoAutoDateString } from '@/lib/pb-types';
import { bucketOf, doneTasks, groupPlan, planItems } from '@/lib/plan';
import { offsetLabel, postDate } from '@/lib/posts';
import type { SongWithStages } from '@/lib/queries';
import { MUSIC_SERVICES, normalizeUrl, serviceForUrl, shortUrl } from '@/lib/services';
import { titleFromNote } from '@/lib/songs';
import { arrayMoveById, nextPosition } from '@/lib/stages';

describe('lyricsParts', () => {
  it('делит текст на части по [Заголовкам]', () => {
    expect(lyricsParts('[Куплет 1]\nраз\nдва\n\n[Припев]\nтри\n')).toEqual([
      { title: 'Куплет 1', lines: ['раз', 'два'] },
      { title: 'Припев', lines: ['три'] },
    ]);
  });

  it('текст без разметки - одна часть без заголовка', () => {
    expect(lyricsParts('\nстрока\n\n')).toEqual([{ title: '', lines: ['строка'] }]);
  });
});

describe('arrayMoveById', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  it('элемент встаёт на место другого', () => {
    expect(arrayMoveById(items, 'c', 'a').map((x) => x.id)).toEqual(['c', 'a', 'b']);
    expect(arrayMoveById(items, 'a', 'c').map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
  it('неизвестный id ничего не меняет', () => {
    expect(arrayMoveById(items, 'x', 'a').map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
  it('новая позиция - в конце', () => {
    expect(
      nextPosition([
        { id: 'a', position: 0 },
        { id: 'b', position: 4 },
      ]),
    ).toBe(5);
    expect(nextPosition([])).toBe(0);
  });
});

describe('titleFromNote', () => {
  it('первая строка заметки', () => {
    expect(titleFromNote('  Баллада про поезд\nв 6/8  ')).toBe('Баллада про поезд');
    expect(titleFromNote('')).toBe('');
    expect(titleFromNote('x'.repeat(100))).toHaveLength(82);
  });
});

describe('mainCover', () => {
  it('выбранная обложка, иначе первая', () => {
    expect(mainCover({ covers: ['a.png', 'b.png'], main_cover: 'b.png' })).toBe('b.png');
    expect(mainCover({ covers: ['a.png', 'b.png'], main_cover: 'gone.png' })).toBe('a.png');
    expect(mainCover({ covers: [], main_cover: '' })).toBeUndefined();
  });
});

describe('даты календаря', () => {
  it('день из календаря хранится полднем UTC и читается тем же днём', () => {
    const stored = fromDay(new Date(2026, 11, 12));
    expect(stored).toBe('2026-12-12 12:00:00.000Z');
    expect(toDay(stored)?.getDate()).toBe(12);
    expect(toDay('')).toBeUndefined();
  });
});

describe('isNetworkError', () => {
  it('обрыв сети - да, ответ сервера - нет', () => {
    expect(isNetworkError(new ClientResponseError({ status: 0 }))).toBe(true);
    expect(isNetworkError(new Error('сеть недоступна'))).toBe(true);
    expect(isNetworkError(new ClientResponseError({ status: 400 }))).toBe(false);
  });
});

describe('релиз', () => {
  const now = new Date(2026, 9, 28, 15);
  it('день релиза наступил - в сам день и после', () => {
    expect(releaseDue('2026-10-28 12:00:00.000Z', now)).toBe(true);
    expect(releaseDue('2026-10-29 12:00:00.000Z', now)).toBe(false);
    expect(releaseDue('', now)).toBe(false);
  });
  it('отправленная песня после даты показывается выпущенной', () => {
    expect(songStatus({ status: 'sent', target_release: '2020-01-01 12:00:00.000Z' })).toBe(
      'released',
    );
    expect(songStatus({ status: 'done', target_release: '2020-01-01 12:00:00.000Z' })).toBe('done');
  });
  it('для отправки нужны дата релиза, текст и обложка для релиза', () => {
    expect(releaseMissing({ lyrics: ' ', release_cover: '' })).toEqual([
      'дата релиза',
      'текст песни',
      'обложка для релиза',
    ]);
  });
});

describe('метки текста песни', () => {
  it('куплеты без номера нумеруются, если их больше одного', () => {
    const parts = lyricsParts('[Куплет]\nа\n[Припев]\nб\n[Куплет]\nв\n[Куплет 7]\nг');
    expect(numberVerses(parts).map((p) => p.title)).toEqual([
      'Куплет 1',
      'Припев',
      'Куплет 2',
      'Куплет 7',
    ]);
    expect(numberVerses(lyricsParts('[Куплет]\nа')).map((p) => p.title)).toEqual(['Куплет']);
  });

  it('копия текста - без меток, части через пустую строку', () => {
    expect(plainLyrics('[Куплет]\nраз\nдва\n\n\n[Припев]\n\nтри\n[Соло]\n')).toBe(
      'раз\nдва\n\nтри',
    );
  });

  it('метка встаёт отдельной строкой после пустой строки', () => {
    expect(insertTag({ value: '', start: 0, end: 0 }, 'Куплет')).toEqual({
      value: '[Куплет]\n',
      start: 9,
      end: 9,
    });
    const text = 'раз\nдва';
    const r = insertTag({ value: text, start: text.length, end: text.length }, 'Припев');
    expect(r.value).toBe('раз\nдва\n\n[Припев]\n');
    expect(r.start).toBe(r.value.length);
    expect(insertTag({ value: 'раз\n', start: 4, end: 4 }, 'Бридж').value).toBe('раз\n\n[Бридж]\n');
  });
});

describe('план', () => {
  const today = new Date(2026, 9, 28, 15, 0);
  const day = (offset: number) => {
    const d = new Date(2026, 9, 28 + offset);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 12:00:00.000Z`;
  };

  it('срок раскладывается по группам', () => {
    expect(bucketOf('', today)).toBe('none');
    expect(bucketOf(day(-1), today)).toBe('overdue');
    expect(bucketOf(day(0), today)).toBe('today');
    expect(bucketOf(day(1), today)).toBe('tomorrow');
    expect(bucketOf(day(6), today)).toBe('week');
    expect(bucketOf(day(7), today)).toBe('later');
  });

  // отметки времени PocketBase - особый вид строки; для образцов годится любая
  const isStamp = (v: string): v is IsoAutoDateString => v.length > 0;
  const isFile = (v: string): v is FileNameString => v.length >= 0;
  const stamp = '2026-10-01 10:00:00.000Z';
  const noFile = '';
  if (!isStamp(stamp) || !isFile(noFile)) throw new Error('нет образцов');
  const base = { collectionId: 'c', created: stamp, updated: stamp };
  const stage = (id: string, extra: Partial<SongStage>): SongStage => ({
    ...base,
    collectionName: 'song_stages',
    id,
    song: 's',
    title: id,
    position: 0,
    status: 'not_started',
    deadline: '',
    assignees: [],
    substeps: [],
    ...extra,
  });
  const song = (status: SongStatus, stages: SongStage[]): SongWithStages => ({
    ...base,
    collectionName: 'songs',
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
    release_cover: noFile,
    release_audio: noFile,
    release_audio_name: '',
    target_release: '',
    expand: { song_stages_via_song: stages },
  });
  const task = (id: string, extra: Partial<Task>): Task => ({
    ...base,
    collectionName: 'tasks',
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
  });

  it('в план - начатые, со сроком или с исполнителем этапы песен в работе и открытые задачи', () => {
    const items = planItems(
      [
        song('active', [
          stage('ждёт', {}),
          stage('в работе', { status: 'in_progress' }),
          stage('со сроком', { deadline: day(2) }),
          stage('чей-то', { assignees: ['u1', 'u2'] }),
          stage('готов', { status: 'done', deadline: day(0) }),
          stage('пропущен', { status: 'skipped', assignees: ['u1'] }),
        ]),
        song('paused', [stage('на паузе', { status: 'in_progress' })]),
      ],
      [task('открытая', {}), task('закрытая', { done: true })],
    );
    expect(items.map((i) => i.id)).toEqual(['в работе', 'со сроком', 'чей-то', 'открытая']);
    expect(
      planItems([], [task('a', { assignees: ['u2', 'u1'] }), task('b', {})], 'u1'),
    ).toHaveLength(1);
  });

  it('группы по порядку сроков, внутри - по дате', () => {
    const groups = groupPlan(
      planItems(
        [],
        [
          task('без срока', {}),
          task('через 3', { due: day(3) }),
          task('вчера', { due: day(-1) }),
          task('через 2', { due: day(2) }),
          task('сегодня', { due: day(0) }),
        ],
      ),
      today,
    );
    expect(groups.map((g) => [g.bucket, g.items.map((i) => i.id)])).toEqual([
      ['overdue', ['вчера']],
      ['today', ['сегодня']],
      ['week', ['через 2', 'через 3']],
      ['none', ['без срока']],
    ]);
  });

  it('выполненные - сначала последние', () => {
    const list = doneTasks([
      task('a', { done: true, done_at: '2026-10-01 10:00:00.000Z' }),
      task('b', { done: true, done_at: '2026-10-02 10:00:00.000Z' }),
      task('c', {}),
    ]);
    expect(list.map((t) => t.id)).toEqual(['b', 'a']);
  });
});

describe('упоминания', () => {
  const people = [
    { id: '1', username: 'pasha', name: 'Паша Иванов' },
    { id: '2', username: 'konan', name: 'Konan' },
    { id: '3', username: 'k.lena', name: 'Лена' },
  ];

  it('находит логины, но не почту', () => {
    expect(mentionedUsernames('@pasha, глянь с @konan. почта a@example.com')).toEqual([
      'pasha',
      'konan',
    ]);
    expect(mentionedIds('спроси @k.lena и @nobody', people)).toEqual(['3']);
  });

  it('делит текст на части', () => {
    expect(splitMentions('бас @pasha!')).toEqual([
      { t: 'text', text: 'бас ' },
      { t: 'mention', username: 'pasha' },
      { t: 'text', text: '!' },
    ]);
  });

  it('запрос после @ перед курсором - по логину и по имени', () => {
    expect(mentionQuery('позвонить @па', 13)).toEqual({ start: 10, query: 'па' });
    expect(mentionQuery('почта a@b', 9)).toBeNull();
    expect(matchPeople(people, 'па').map((p) => p.id)).toEqual(['1']);
    expect(matchPeople(people, 'ив').map((p) => p.id)).toEqual(['1']);
    expect(matchPeople(people, 'k').map((p) => p.id)).toEqual(['2', '3']);
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
    expect(
      postDate({ anchor: 'date', date: '2026-11-01 12:00:00.000Z', offset: 0, song: '' }, songs),
    ).toBe('2026-11-01 12:00:00.000Z');
    expect(postDate({ anchor: 'release', date: '', offset: -7, song: 's1' }, songs)).toBe(
      '2026-11-13 12:00:00.000Z',
    );
    expect(postDate({ anchor: 'release', date: '', offset: 3, song: 's2' }, songs)).toBe('');
  });

  it('сдвиг от релиза словами', () => {
    expect(offsetLabel(0)).toBe('в день релиза');
    expect(offsetLabel(-1)).toBe('за день до релиза');
    expect(offsetLabel(1)).toBe('через день после релиза');
    expect(offsetLabel(-3)).toBe('за 3 дня до релиза');
    expect(offsetLabel(-7)).toBe('за неделю до релиза');
    expect(offsetLabel(14)).toBe('через 2 недели после релиза');
    expect(offsetLabel(5)).toBe('через 5 дней после релиза');
  });
});

describe('тональность', () => {
  it('разбирает привычные записи и приводит к одному виду', () => {
    const f = (raw: string) => {
      const k = parseKey(raw);
      return k ? formatKey(k) : null;
    };
    expect(f('Am')).toBe('Am');
    expect(f('a minor')).toBe('Am');
    expect(f('F# maj')).toBe('F#');
    expect(f('Db')).toBe('C#');
    expect(f('Abm')).toBe('G#m');
    expect(f('A#m')).toBe('Bbm');
    expect(f('ля минор')).toBeNull();
    expect(f('H')).toBeNull();
  });
  it('подсказка по-русски', () => {
    expect(keyName({ tonic: 'A', minor: true })).toBe('ля минор');
    expect(keyName({ tonic: 'F#', minor: false })).toBe('фа-диез мажор');
  });
});

describe('ссылки проекта', () => {
  it('дописывает https и узнаёт сервис по адресу', () => {
    const n = (v: string) => normalizeUrl(v);
    expect(n('music.yandex.ru/artist/1')).toBe('https://music.yandex.ru/artist/1');
    expect(n('просто текст')).toBeNull();
    expect(n('localhost')).toBeNull();
    const s = (v: string) => serviceForUrl(MUSIC_SERVICES, n(v) ?? '')?.id;
    expect(s('https://music.yandex.ru/artist/1')).toBe('yandex_music');
    expect(s('open.spotify.com/artist/x')).toBe('spotify');
    expect(s('https://www.youtube.com/@band')).toBe('youtube');
    expect(s('music.youtube.com/channel/x')).toBe('youtube');
    expect(s('https://zvuk.com/artist/1')).toBe('zvuk');
    expect(s('https://example.com')).toBeUndefined();
    expect(shortUrl('https://www.instagram.com/band/')).toBe('instagram.com/band');
  });
});
