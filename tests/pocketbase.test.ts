// Схема, правила доступа и 2FA на настоящем PocketBase: временный каталог данных, миграции и
// хуки проекта, свободный порт. Бинарник - pocketbase/bin/pocketbase (tools/pocketbase.sh
// скачивает его); без него прогон падает. Пропустить эти тесты можно только явно:
// BOUNCE_SKIP_PB=1.
import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import PocketBase, { ClientResponseError } from 'pocketbase';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSendVerdict, SendVerdict } from '@/lib/errors';
import { checkHasStringField, getField } from '@/lib/guards';
import { getNewRecordId } from '@/lib/id';
import {
  type Post,
  PostAnchor,
  PostStatus,
  type Project,
  type Song,
  SongStatus,
  StageStatus,
  type StageTemplate,
  type Task,
} from '@/lib/model';
import {
  createNote,
  EMPTY_NOTES_FILTER,
  getNotesFilter,
  NoteLevel,
  type NotesFilter,
} from '@/lib/notes';
import { Collections, getCollection } from '@/lib/pb';
import type { PromoTemplatesResponse } from '@/lib/pb-types';
import { createPost } from '@/lib/posts';
import { createProject } from '@/lib/projects';
import { ProjectRole } from '@/lib/roles';
import { createSong, createSongFromNote, createStagesFromTemplate } from '@/lib/songs';
import { moveItemById, savePositions } from '@/lib/stages';
import { createTask } from '@/lib/tasks';

/** Бинарник PocketBase */
const PB_BINARY = join(process.cwd(), 'pocketbase/bin/pocketbase');

/** Миграции проекта */
const MIGRATIONS_DIR = join(process.cwd(), 'pocketbase/pb_migrations');

/** Хуки проекта */
const HOOKS_DIR = join(process.cwd(), 'pocketbase/pb_hooks');

/**
 * Тесты на сервере пропущены явно (BOUNCE_SKIP_PB=1)
 *
 * Без бинарника интеграционные тесты не должны пропасть незаметно: прогон падает на проверке
 * ниже, а сами тесты пропускаются, чтобы не сыпать одинаковыми ошибками запуска
 */
const IS_PB_SKIPPED = process.env.BOUNCE_SKIP_PB === '1';

/** Бинарника PocketBase нет */
const IS_BINARY_MISSING = !existsSync(PB_BINARY);

/** Тесты на запущенном сервере не выполняются */
const SHOULD_SKIP_SERVER_TESTS = IS_PB_SKIPPED || IS_BINARY_MISSING;

/** Суперпользователь временного сервера */
const SUPERUSER = { email: 'admin@example.com', password: 'admin-password-1' };

/** Пароль всех тестовых пользователей */
const PASSWORD = 'user-password-1';

/** Заведомо неверный пароль */
const WRONG_PASSWORD = 'wrong-password';

/** Пароль, который главный задаёт другому */
const NEW_PASSWORD = 'new-password-2';

/** Пароль, заданный при сбросе 2FA главного */
const RESET_PASSWORD = 'new-password-3';

/** Адрес, на котором слушает временный сервер */
const LOCALHOST = '127.0.0.1';

/** Попыток дождаться запуска сервера */
const HEALTH_ATTEMPTS = 100;

/** Пауза между попытками дождаться запуска сервера, мс */
const HEALTH_POLL_MS = 100;

/** Пауза перед ожиданием сервера после восстановления копии (он перезапускается), мс */
const RESTART_DELAY_MS = 1000;

/** Длина шага TOTP, секунды */
const TOTP_STEP_SECONDS = 30;

/** Миллисекунд в секунде */
const MS_PER_SECOND = 1000;

/** Миллисекунд в сутках */
const MS_PER_DAY = 24 * 60 * 60 * MS_PER_SECOND;

/** Байтов в мегабайте */
const BYTES_PER_MB = 1024 * 1024;

/** Размер короткого тестового аудио, байты */
const SMALL_AUDIO_SIZE = 1024;

/** Поле ошибки, в котором хуки 2FA отдают код отказа */
const TOTP_ERROR_FIELD = 'code';

/** Метод запросов к своим маршрутам хуков */
const POST_METHOD = 'POST';

/** Получить ключ для подключения 2FA */
const TOTP_SETUP_PATH = '/api/bounce/totp/setup';

/** Подключить 2FA кодом из приложения */
const TOTP_ENABLE_PATH = '/api/bounce/totp/enable';

/** Собрать резервную копию */
const BACKUP_PATH = '/api/bounce/backup';

/** Id коллекции суперпользователей (вход по id вместо имени) */
const SUPERUSERS_COLLECTION_ID = 'pbc_3142635823';

/** Адрес клиента за прокси в X-Forwarded-For (из блока для документации) */
const PROXY_CLIENT_IP = '203.0.113.5';

/** Размер превью файла */
const THUMB_SIZE = '96x96';

/** MIME-тип PNG */
const PNG_TYPE = 'image/png';

/** MIME-тип архива резервной копии */
const ZIP_TYPE = 'application/zip';

/** MIME-тип WAV */
const WAV_TYPE = 'audio/wav';

/** Сторона обложки для релиза, пиксели */
const COVER_SIZE = 3000;

/** Сколько человек одновременно входят одним кодом */
const PARALLEL_LOGINS = 8;

/** Сколько раз одновременно подтверждается ключ 2FA */
const PARALLEL_ENABLES = 20;

/** Кругов по два запроса (setup и enable) до предела частоты: 10 запросов */
const RATE_LIMIT_ROUNDS = 5;

/** Миграция, которая сделала исполнителей списком */
const ASSIGNEES_MIGRATION = '1762600000';

/** Функции TOTP из хуков PocketBase (pb_hooks/lib/totp.js) */
interface Totp {
  getCode(secret: string, unixSeconds: number): string;
}

/** Размер картинки */
interface JpegSize {
  width: number;
  height: number;
}

/** Функции JPEG из хуков PocketBase (pb_hooks/lib/jpeg.js) */
interface JpegLib {
  /** Размер из заголовка кадра; read читает length байтов с offset */
  getJpegSize(read: (offset: number, length: number) => ArrayLike<number>): JpegSize | null;
}

/** Параметры тестового JPEG */
interface GrayJpegOptions {
  /** Маркер кадра (SOFn), по умолчанию SOF0 */
  sof?: number;
  /** Сырые байты после SOI (сегменты APPn, заполнители 0xFF и т.п.) */
  head?: readonly number[];
}

/** Итог чтения размера JPEG */
interface JpegMeasure {
  size: JpegSize | null;
  /** Сколько байтов прочитано */
  readCount: number;
}

/** Ответ на запрос ключа 2FA */
interface TotpSetupResponse {
  secret: string;
}

/** Ответ на сборку или загрузку резервной копии */
interface BackupResponse {
  name: string;
}

/** Тестовый пользователь: свой клиент, id и ключ 2FA (пустой - 2FA не подключена) */
interface TestUser {
  client: PocketBase;
  id: string;
  secret: string;
}

/** Пользователь без ключа 2FA под рукой: клиент и id */
interface TestMember {
  client: PocketBase;
  id: string;
}

/** Маркеры JPEG, из которых собираются тестовые файлы */
enum JpegMarker {
  /** Начало файла */
  Soi = 0xd8,
  /** Конец файла */
  Eoi = 0xd9,
  /** Таблица квантования */
  Dqt = 0xdb,
  /** Кадр baseline */
  Sof0 = 0xc0,
  /** Таблица Хаффмана */
  Dht = 0xc4,
  /** Условия арифметического кодирования */
  Dac = 0xcc,
  /** Начало данных скана */
  Sos = 0xda,
  /** Сегмент приложения APP0; APPn - App0 + n */
  App0 = 0xe0,
}

/** Класс таблицы Хаффмана */
enum HuffmanTableClass {
  /** Для коэффициентов DC */
  Dc = 0x00,
  /** Для коэффициентов AC */
  Ac = 0x10,
}

/** Байт перед каждым маркером JPEG */
const MARKER_PREFIX = 0xff;

/** Маска одного байта */
const BYTE_MASK = 0xff;

/** Битов в байте */
const BITS_PER_BYTE = 8;

/** Длина поля длины сегмента: два байта, входят в длину */
const SEGMENT_LENGTH_SIZE = 2;

/** Сторона блока JPEG, пиксели */
const BLOCK_SIZE = 8;

/** Битов на блок: код "разность DC = 0" и код "конец блока" по 1 биту */
const BITS_PER_BLOCK = 2;

/** Таблица квантования 0: точность 8 бит, все 64 коэффициента - 1 */
const QUANT_TABLE = [0, ...new Array(64).fill(1)];

/** Число кодов каждой длины от 1 до 16 бит: один код длиной 1 бит */
const SINGLE_CODE_LENGTHS = [1, ...new Array(15).fill(0)];

/** Символ единственного кода: "разность DC = 0" для DC, "конец блока" для AC */
const SINGLE_CODE_SYMBOL = 0;

/** Точность отсчётов кадра, бит */
const SAMPLE_PRECISION = 8;

/** Компоненты кадра: одна, id 1, без субдискретизации (0x11), таблица квантования 0 */
const FRAME_COMPONENTS = [1, 1, 0x11, 0];

/** Заголовок скана: одна компонента, таблицы Хаффмана 0, коэффициенты 0..63 */
const SCAN_HEADER = [1, 1, 0, 0, 63, 0];

/** Конец файла JPEG */
const END_MARKER = [MARKER_PREFIX, JpegMarker.Eoi];

/** Байт-заполнитель содержимого сегментов APPn ("A") */
const FILLER_BYTE = 0x41;

/** Размер заголовка WAV, байты */
const WAV_HEADER_SIZE = 44;

/** Заголовок блока RIFF (метка и длина) не входит в длину блока, байты */
const RIFF_CHUNK_HEADER_SIZE = 8;

/** Длина блока "fmt " для PCM, байты */
const WAV_FMT_SIZE = 16;

/** Формат PCM */
const WAV_PCM_FORMAT = 1;

/** Каналов: стерео */
const WAV_CHANNELS = 2;

/** Частота дискретизации, Гц */
const WAV_SAMPLE_RATE = 44100;

/** Байтов на отсчёт всех каналов: 2 канала по 16 бит */
const WAV_BLOCK_ALIGN = 4;

/** Битов на отсчёт одного канала */
const WAV_BITS_PER_SAMPLE = 16;

/** Числа в WAV записываются младшим байтом вперёд */
const LITTLE_ENDIAN = true;

/** Ширина числа в дате: месяц и день - две цифры */
const DATE_PART_LENGTH = 2;

/** Картинка 1x1 PNG */
const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1,
  0, 0, 0, 1, 8, 6, 0, 0, 0, 0x1f, 0x15, 0xc4, 0x89, 0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
  0x60, 0x82,
]);

/** 0,1 с тишины в MP3 (ffmpeg, libmp3lame 32 кбит/с), base64 */
const MP3_SILENCE =
  '//NAxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEWwAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsSjAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

/**
 * Команды для проверки отката миграций
 *
 * test-seed заводит людей, этап и задачу с двумя исполнителями, test-dump пишет в файл, кто
 * остался исполнителем после отката к одному исполнителю
 */
const SEED = `
$app.rootCmd.addCommand(new Command({
  use: 'test-seed',
  run: (_cmd, args) => {
    const findCollection = (name) => $app.findCollectionByNameOrId(name);
    const ids = [];
    for (const name of ['ann', 'ben']) {
      const user = new Record(findCollection('users'));
      user.set('username', name);
      user.set('name', name);
      user.setPassword('password-123');
      $app.save(user);
      ids.push(user.id);
    }
    const project = new Record(findCollection('projects'));
    project.set('name', 'P');
    project.set('owner', ids[0]);
    project.set('editors', [ids[1]]);
    $app.save(project);
    const song = new Record(findCollection('songs'));
    song.set('project', project.id);
    song.set('title', 'S');
    song.set('status', 'active');
    $app.save(song);
    const stage = new Record(findCollection('song_stages'));
    stage.set('song', song.id);
    stage.set('title', 'E');
    stage.set('status', 'not_started');
    stage.set('assignees', [ids[0], ids[1]]);
    $app.save(stage);
    const task = new Record(findCollection('tasks'));
    task.set('project', project.id);
    task.set('title', 'T');
    task.set('author', ids[0]);
    task.set('assignees', [ids[1], ids[0]]);
    $app.save(task);
    const out = { ann: ids[0], ben: ids[1], stage: stage.id, task: task.id };
    $os.writeFile(args[0], JSON.stringify(out), 0o644);
  },
}));
$app.rootCmd.addCommand(new Command({
  use: 'test-dump',
  run: (_cmd, args) => {
    const ids = JSON.parse(toString($os.readFile(args[0])));
    const stage = $app.findRecordById('song_stages', ids.stage);
    const task = $app.findRecordById('tasks', ids.task);
    const out = { stage: stage.getString('assignee'), task: task.getString('assignee') };
    $os.writeFile(args[1], JSON.stringify(out), 0o644);
  },
}));
`;

/** require для CommonJS-модулей хуков */
const requireModule = createRequire(import.meta.url);

/** TOTP из хуков PocketBase */
const totp: Totp = requireModule('../pocketbase/pb_hooks/lib/totp.js');

/** Чтение размера JPEG из хуков PocketBase */
const jpegLib: JpegLib = requireModule('../pocketbase/pb_hooks/lib/jpeg.js');

/** Текущее время в секундах Unix */
function getUnixNow(): number {
  return Math.floor(Date.now() / MS_PER_SECOND);
}

/** Число в два байта, старшим вперёд */
function toUint16Bytes(value: number): number[] {
  return [value >> BITS_PER_BYTE, value & BYTE_MASK];
}

/** Сегмент JPEG: маркер, длина (вместе с собой) и содержимое */
function createSegment(marker: number, body: readonly number[]): number[] {
  const length = body.length + SEGMENT_LENGTH_SIZE;
  return [MARKER_PREFIX, marker, ...toUint16Bytes(length), ...body];
}

/** Содержимое DHT: таблица из одного кода длиной 1 бит */
function createSingleCodeTable(tableClass: HuffmanTableClass): number[] {
  return [tableClass, ...SINGLE_CODE_LENGTHS, SINGLE_CODE_SYMBOL];
}

/**
 * Настоящий однотонный серый JPEG (baseline, одна компонента)
 *
 * Таблицы Хаффмана - по одному коду длиной 1 бит: "разность DC = 0" и "конец блока", так что
 * блок 8x8 - 2 бита, а 3000x3000 весит около 35 КБ
 */
function createGrayJpeg(
  width: number,
  height: number,
  options: GrayJpegOptions = {},
): Uint8Array<ArrayBuffer> {
  const blockCount = Math.ceil(width / BLOCK_SIZE) * Math.ceil(height / BLOCK_SIZE);
  const bitCount = blockCount * BITS_PER_BLOCK;
  const scanData = new Uint8Array(Math.ceil(bitCount / BITS_PER_BYTE));
  // хвост последнего байта добивается единицами, как требует формат
  const tailBitCount = bitCount % BITS_PER_BYTE;
  if (tailBitCount > 0) {
    scanData[scanData.length - 1] = (1 << (BITS_PER_BYTE - tailBitCount)) - 1;
  }
  const extraHead = options.head ?? [];
  const frameMarker = options.sof ?? JpegMarker.Sof0;
  const frameHeader = [
    SAMPLE_PRECISION,
    ...toUint16Bytes(height),
    ...toUint16Bytes(width),
    ...FRAME_COMPONENTS,
  ];
  const head = [
    MARKER_PREFIX,
    JpegMarker.Soi,
    ...extraHead,
    ...createSegment(JpegMarker.Dqt, QUANT_TABLE),
    ...createSegment(frameMarker, frameHeader),
    ...createSegment(JpegMarker.Dht, createSingleCodeTable(HuffmanTableClass.Dc)),
    ...createSegment(JpegMarker.Dht, createSingleCodeTable(HuffmanTableClass.Ac)),
    ...createSegment(JpegMarker.Sos, SCAN_HEADER),
  ];
  const jpeg = new Uint8Array(head.length + scanData.length + END_MARKER.length);
  jpeg.set(head);
  jpeg.set(scanData, head.length);
  jpeg.set(END_MARKER, head.length + scanData.length);
  return jpeg;
}

/** Размер JPEG чтением по кускам, как в хуке; readCount - сколько байтов прочитано */
function measureJpeg(bytes: Uint8Array): JpegMeasure {
  let readCount = 0;
  const size = jpegLib.getJpegSize((offset, length) => {
    const part = bytes.subarray(offset, offset + length);
    readCount += part.length;
    return part;
  });
  return { size, readCount };
}

/** Сегмент APPn из length байтов-заполнителей */
function createAppSegment(index: number, length: number): number[] {
  return createSegment(JpegMarker.App0 + index, new Array(length).fill(FILLER_BYTE));
}

/** Обложка для релиза: JPEG width x height */
function createCoverFile(width = COVER_SIZE, height = COVER_SIZE): File {
  return new File([createGrayJpeg(width, height)], 'cover.jpg', { type: 'image/jpeg' });
}

/** Число в дате с ведущим нулём */
function padDatePart(part: number): string {
  return String(part).padStart(DATE_PART_LENGTH, '0');
}

/** День через offset дней от сегодня в формате PocketBase (полдень UTC) */
function getDayFromNow(offset: number): string {
  const date = new Date(Date.now() + offset * MS_PER_DAY);
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());
  return `${date.getFullYear()}-${month}-${day} 12:00:00.000Z`;
}

/** Свободный порт на localhost */
function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, LOCALHOST, () => {
      const address = server.address();
      server.close(() => {
        const hasPort = typeof address === 'object' && address !== null;
        if (!hasPort) {
          reject();
          return;
        }
        resolve(address.port);
      });
    });
  });
}

/** Сервер отвечает на проверку здоровья; ещё не слушает - нет */
function checkIsHealthy(baseUrl: string): Promise<boolean> {
  return fetch(`${baseUrl}/api/health`)
    .then((response) => response.ok)
    .catch(() => false);
}

/** Дождаться, пока сервер начнёт отвечать */
async function waitForHealth(baseUrl: string): Promise<void> {
  for (let attempt = 0; attempt < HEALTH_ATTEMPTS; attempt++) {
    if (await checkIsHealthy(baseUrl)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, HEALTH_POLL_MS));
  }
  throw new Error('PocketBase не поднялся');
}

/** Код ошибки поля из ответа 400 (по умолчанию - поля code у ошибок 2FA) */
function getErrorCode(error: unknown, field = TOTP_ERROR_FIELD): string {
  if (!(error instanceof ClientResponseError)) {
    return '';
  }
  const fieldError = getField(error.response.data, field);
  if (!checkHasStringField(fieldError, 'code')) {
    return '';
  }
  return fieldError.code;
}

/** Статус ответа сервера из ошибки; не ответ сервера - 0 */
function getResponseStatus(error: unknown): number {
  if (!(error instanceof ClientResponseError)) {
    return 0;
  }
  return error.status;
}

/** Текст ответа сервера из ошибки; не ответ сервера - пусто */
function getResponseMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return '';
  }
  return error.response.message;
}

/** Ошибка, с которой отклонён запрос; запрос прошёл - тест падает */
async function getRejection(request: Promise<unknown>): Promise<unknown> {
  try {
    await request;
  } catch (error) {
    return error;
  }
  throw new Error('ожидалась ошибка');
}

/** Статус ответа, с которым отклонён запрос */
async function getRejectionStatus(request: Promise<unknown>): Promise<number> {
  return getResponseStatus(await getRejection(request));
}

/** Подключить 2FA текущему пользователю клиента; возвращает ключ */
async function enrollTotp(client: PocketBase): Promise<string> {
  const setup: TotpSetupResponse = await client.send(TOTP_SETUP_PATH, { method: POST_METHOD });
  await client.send(TOTP_ENABLE_PATH, {
    method: POST_METHOD,
    body: { code: totp.getCode(setup.secret, getUnixNow()) },
  });
  await client.collection(Collections.Users).authRefresh();
  return setup.secret;
}

/** Из параллельных запросов: сколько прошло */
async function countFulfilled(requests: Promise<unknown>[]): Promise<number> {
  const results = await Promise.allSettled(requests);
  return results.filter((result) => result.status === 'fulfilled').length;
}

/** WAV-заголовок и тишина: PocketBase распознаёт файл как audio/wav */
function createWav(dataSize: number): Blob {
  const header = new Uint8Array(WAV_HEADER_SIZE);
  const view = new DataView(header.buffer);
  const writeAscii = (offset: number, text: string): void => {
    for (let index = 0; index < text.length; index++) {
      header[offset + index] = text.charCodeAt(index);
    }
  };
  // смещения полей - по формату WAV
  writeAscii(0, 'RIFF');
  view.setUint32(4, WAV_HEADER_SIZE - RIFF_CHUNK_HEADER_SIZE + dataSize, LITTLE_ENDIAN);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, WAV_FMT_SIZE, LITTLE_ENDIAN);
  view.setUint16(20, WAV_PCM_FORMAT, LITTLE_ENDIAN);
  view.setUint16(22, WAV_CHANNELS, LITTLE_ENDIAN);
  view.setUint32(24, WAV_SAMPLE_RATE, LITTLE_ENDIAN);
  view.setUint32(28, WAV_SAMPLE_RATE * WAV_BLOCK_ALIGN, LITTLE_ENDIAN);
  view.setUint16(32, WAV_BLOCK_ALIGN, LITTLE_ENDIAN);
  view.setUint16(34, WAV_BITS_PER_SAMPLE, LITTLE_ENDIAN);
  writeAscii(36, 'data');
  view.setUint32(40, dataSize, LITTLE_ENDIAN);
  return new Blob([header, new Uint8Array(dataSize)], { type: WAV_TYPE });
}

/** Файл WAV с тишиной: dataSize байтов данных */
function createWavFile(dataSize: number, name: string): File {
  return new File([createWav(dataSize)], name, { type: WAV_TYPE });
}

/** Файл картинки 1x1 PNG */
function createPngFile(name: string): File {
  return new File([PNG_BYTES], name, { type: PNG_TYPE });
}

/** Сброс 2FA пользователя главным */
function getTotpResetPath(userId: string): string {
  return `/api/bounce/users/${userId}/totp-reset`;
}

/** Фильтр записей проекта */
function getProjectFilter(client: PocketBase, projectId: string): string {
  return client.filter('project = {:projectId}', { projectId });
}

/** Фильтр записей песни */
function getSongFilter(client: PocketBase, songId: string): string {
  return client.filter('song = {:songId}', { songId });
}

/** Ключи --dir, --migrationsDir и --hooksDir для команд pocketbase */
function getDirArgs(dataDir: string, hooksDir = HOOKS_DIR): string[] {
  return [
    '--dir',
    join(dataDir, 'pb_data'),
    '--migrationsDir',
    MIGRATIONS_DIR,
    '--hooksDir',
    hooksDir,
  ];
}

/** Запустить сервер PocketBase на порту */
function spawnServer(port: number, dirArgs: string[]): ChildProcess {
  return spawn(PB_BINARY, ['serve', '--http', `${LOCALHOST}:${port}`, ...dirArgs], {
    stdio: 'ignore',
  });
}

/** Адрес временного сервера */
function getBaseUrl(port: number): string {
  return `http://${LOCALHOST}:${port}`;
}

describe('JPEG: размер из заголовка (lib/jpeg.js)', () => {
  it('ширина и высота из SOF0', () => {
    expect(measureJpeg(createGrayJpeg(COVER_SIZE, COVER_SIZE)).size).toEqual({
      width: 3000,
      height: 3000,
    });
    expect(measureJpeg(createGrayJpeg(2999, 3000)).size).toEqual({ width: 2999, height: 3000 });
    expect(measureJpeg(createGrayJpeg(1, 1)).size).toEqual({ width: 1, height: 1 });
  });

  it('прогрессивный и прочие SOFn; DHT, DAC и JPG кадром не считаются', () => {
    for (const sof of [0xc1, 0xc2, 0xc3, 0xc5, 0xc7, 0xc9, 0xcb, 0xcd, 0xcf]) {
      expect(measureJpeg(createGrayJpeg(640, 480, { sof })).size).toEqual({
        width: 640,
        height: 480,
      });
    }
    // DHT и DAC до кадра: у них свои данные, размер не из них
    const head = [
      ...createSegment(JpegMarker.Dht, createSingleCodeTable(HuffmanTableClass.Dc)),
      ...createSegment(JpegMarker.Dac, [0, 1]),
    ];
    expect(measureJpeg(createGrayJpeg(COVER_SIZE, COVER_SIZE, { head })).size).toEqual({
      width: 3000,
      height: 3000,
    });
  });

  it('большие EXIF и XMP перед кадром пропускаются, а не читаются', () => {
    const head = [
      ...createAppSegment(0, 14),
      ...createAppSegment(1, 60000),
      ...createAppSegment(1, 60000),
      ...createAppSegment(2, 30000),
    ];
    const { size, readCount } = measureJpeg(createGrayJpeg(COVER_SIZE, COVER_SIZE, { head }));
    expect(size).toEqual({ width: 3000, height: 3000 });
    expect(readCount).toBeLessThan(100);
  });

  it('заполнители 0xFF перед маркером и RST/TEM без длины', () => {
    const head = [0xff, 0xff, 0xff, 0xff, 0x01, 0xff, 0xd0];
    expect(measureJpeg(createGrayJpeg(COVER_SIZE, COVER_SIZE, { head })).size).toEqual({
      width: 3000,
      height: 3000,
    });
  });

  it('не JPEG, обрезанный файл, данные или конец без кадра - null', () => {
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d,
    ]);
    expect(measureJpeg(pngBytes).size).toBeNull();
    expect(measureJpeg(new Uint8Array()).size).toBeNull();
    const full = createGrayJpeg(COVER_SIZE, COVER_SIZE, { head: createAppSegment(1, 1000) });
    expect(measureJpeg(full.subarray(0, 600)).size).toBeNull();
    // обрыв посреди заголовка кадра
    expect(measureJpeg(full.subarray(0, 1080)).size).toBeNull();
    const noFrame = new Uint8Array([
      MARKER_PREFIX,
      JpegMarker.Soi,
      ...createSegment(JpegMarker.Sos, SCAN_HEADER),
      0,
      0,
    ]);
    expect(measureJpeg(noFrame).size).toBeNull();
    const startAndEnd = new Uint8Array([MARKER_PREFIX, JpegMarker.Soi, ...END_MARKER]);
    expect(measureJpeg(startAndEnd).size).toBeNull();
    // мусор вместо маркера
    expect(
      measureJpeg(new Uint8Array([MARKER_PREFIX, JpegMarker.Soi, 0x12, 0x34])).size,
    ).toBeNull();
  });
});

describe.skipIf(IS_PB_SKIPPED)('PocketBase: бинарник', () => {
  it('на месте', () => {
    if (IS_BINARY_MISSING) {
      throw new Error(
        'Нет pocketbase/bin/pocketbase, интеграционные тесты не запустить. Запустите ' +
          'tools/pocketbase.sh: при первом запуске он скачает PocketBase из pocketbase/VERSION ' +
          '(сервер после этого можно остановить). Пропустить эти тесты осознанно: BOUNCE_SKIP_PB=1.',
      );
    }
  });
});

describe.skipIf(SHOULD_SKIP_SERVER_TESTS)('PocketBase: доступ, проекты, заметки, 2FA', () => {
  let dataDir = '';
  let baseUrl = '';
  let serverProcess: ChildProcess | undefined;
  // konan - главный, bob и carol - участники с 2FA, dave - без 2FA, erin - с 2FA, но проекты
  // создавать не может
  const testUsers: Record<string, TestUser> = {};
  let project: Project;
  let templates: StageTemplate[] = [];
  // --dir, --migrationsDir, --hooksDir: команды pocketbase рядом с запущенным сервером
  let dirArgs: string[] = [];

  beforeAll(async () => {
    dataDir = mkdtempSync(join(tmpdir(), 'bounce-pb-'));
    dirArgs = getDirArgs(dataDir);
    execFileSync(PB_BINARY, [
      'superuser',
      'upsert',
      SUPERUSER.email,
      SUPERUSER.password,
      ...dirArgs,
    ]);
    execFileSync(PB_BINARY, ['bounce-admin', 'konan', PASSWORD, 'Konan', ...dirArgs]);
    const port = await getFreePort();
    baseUrl = getBaseUrl(port);
    serverProcess = spawnServer(port, dirArgs);
    await waitForHealth(baseUrl);

    // тесты шлют запросы быстрее человека: ограничение частоты им мешает
    const superuserClient = new PocketBase(baseUrl);
    await superuserClient
      .collection(Collections.Superusers)
      .authWithPassword(SUPERUSER.email, SUPERUSER.password);
    await superuserClient.settings.update({ rateLimits: { enabled: false } });

    const konan = new PocketBase(baseUrl);
    const konanAuth = await konan.collection(Collections.Users).authWithPassword('konan', PASSWORD);
    testUsers.konan = { client: konan, id: konanAuth.record.id, secret: await enrollTotp(konan) };

    for (const name of ['bob', 'carol', 'dave', 'erin']) {
      const created = await getCollection(konan, Collections.Users).create({
        username: name,
        name: name.toUpperCase(),
        password: PASSWORD,
        passwordConfirm: PASSWORD,
        can_create_projects: name !== 'erin',
      });
      const client = new PocketBase(baseUrl);
      await client.collection(Collections.Users).authWithPassword(name, PASSWORD);
      let secret = '';
      if (name !== 'dave') {
        secret = await enrollTotp(client);
      }
      testUsers[name] = { client, id: created.id, secret };
    }

    const bob = testUsers.bob;
    if (!bob) {
      throw new Error('нет bob');
    }
    const konanId = testUsers.konan?.id ?? '';
    project = await createProject(bob.client, {
      name: 'Дуэт',
      owner: bob.id,
      roles: { [ProjectRole.Editor]: [konanId] },
    });
    // шаблон проекта сначала пустой; для тестов песен - два этапа
    const stageTemplates = getCollection(bob.client, Collections.StageTemplates);
    await stageTemplates.create({ project: project.id, title: 'Демо', position: 0, substeps: [] });
    await stageTemplates.create({
      project: project.id,
      title: 'Запись',
      position: 1,
      substeps: [
        { id: 'sub000000000001', title: 'Бас' },
        { id: 'sub000000000002', title: 'Вокал' },
      ],
    });
    templates = await stageTemplates.getFullList<StageTemplate>({
      filter: getProjectFilter(bob.client, project.id),
      sort: 'position',
    });
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
    if (dataDir) {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });

  // тестовый пользователь по имени
  function getUser(name: string): TestUser {
    const user = testUsers[name];
    if (!user) {
      throw new Error(`нет ${name}`);
    }
    return user;
  }

  // новый клиент без входа
  function createClient(): PocketBase {
    return new PocketBase(baseUrl);
  }

  // новый пользователь, вошедший паролем (2FA ещё не подключена)
  async function createSignedInUser(username: string): Promise<PocketBase> {
    await getCollection(getUser('konan').client, Collections.Users).create({
      username,
      name: username,
      password: PASSWORD,
      passwordConfirm: PASSWORD,
    });
    const client = createClient();
    await client.collection(Collections.Users).authWithPassword(username, PASSWORD);
    return client;
  }

  // новый пользователь с подключённой 2FA
  async function createEnrolledUser(username: string): Promise<TestMember> {
    const client = await createSignedInUser(username);
    await enrollTotp(client);
    return { client, id: client.authStore.record?.id ?? '' };
  }

  describe('вход и 2FA', () => {
    it('с 2FA без кода токена нет, с неверным тоже; верный код - один раз', async () => {
      const client = createClient();
      const usersCollection = client.collection(Collections.Users);
      // SDK заменяет тело запроса целиком, поэтому логин и пароль - в нём же
      const loginWithCode = (code: string): Promise<unknown> =>
        usersCollection.authWithPassword('konan', PASSWORD, {
          body: { identity: 'konan', password: PASSWORD, code },
        });
      const withoutCode = await getRejection(usersCollection.authWithPassword('konan', PASSWORD));
      expect(getErrorCode(withoutCode)).toBe('totp_required');
      expect(getErrorCode(await getRejection(loginWithCode('1')))).toBe('totp_invalid');
      // следующий шаг времени: код подключения уже израсходован
      const code = totp.getCode(getUser('konan').secret, getUnixNow() + TOTP_STEP_SECONDS);
      await loginWithCode(code);
      expect(client.authStore.isValid).toBe(true);
      expect(getErrorCode(await getRejection(loginWithCode(code)))).toBe('totp_invalid');
    });

    it('один код - один вход и при параллельных запросах', async () => {
      const secret = await enrollTotp(await createSignedInUser('gina'));
      const code = totp.getCode(secret, getUnixNow() + TOTP_STEP_SECONDS);
      const login = (): Promise<unknown> =>
        createClient()
          .collection(Collections.Users)
          .authWithPassword('gina', PASSWORD, {
            body: { identity: 'gina', password: PASSWORD, code },
          });
      expect(await countFulfilled(Array.from({ length: PARALLEL_LOGINS }, login))).toBe(1);
      expect(getErrorCode(await getRejection(login()))).toBe('totp_invalid');
    });

    it('ключ 2FA подтверждается одним кодом один раз и при параллельных запросах', async () => {
      const client = await createSignedInUser('hana');
      const setup: TotpSetupResponse = await client.send(TOTP_SETUP_PATH, {
        method: POST_METHOD,
      });
      const code = totp.getCode(setup.secret, getUnixNow());
      // requestKey: null - иначе SDK сам отменяет одинаковые запросы, кроме последнего
      const enable = (): Promise<unknown> =>
        client.send(TOTP_ENABLE_PATH, {
          method: POST_METHOD,
          body: { code },
          requestKey: null,
        });
      // окно гонки здесь уже, чем при входе: запросов больше (без атомарной отметки - 2-4 из 20)
      expect(await countFulfilled(Array.from({ length: PARALLEL_ENABLES }, enable))).toBe(1);
      await client.collection(Collections.Users).authRefresh();
      expect(client.authStore.record?.totp_enabled).toBe(true);
    });

    it('о 2FA не говорится, пока пароль неверный', async () => {
      const client = createClient();
      const error = await getRejection(
        client.collection(Collections.Users).authWithPassword('konan', WRONG_PASSWORD),
      );
      expect(getErrorCode(error)).toBe('');
    });

    it('без подключённой 2FA данных нет', async () => {
      const dave = getUser('dave').client;
      expect((await getCollection(dave, Collections.Projects).getList()).items).toHaveLength(0);
      expect((await getCollection(dave, Collections.Users).getList()).items).toHaveLength(0);
      await expect(
        createProject(dave, { name: 'Свой', owner: getUser('dave').id }),
      ).rejects.toThrow();
    });

    it('2FA нельзя выключить себе через API', async () => {
      const bob = getUser('bob');
      await expect(
        getCollection(bob.client, Collections.Users).update(bob.id, { totp_enabled: false }),
      ).rejects.toThrow();
    });
  });

  describe('суперпользователь', () => {
    it('через прокси (X-Forwarded-For) не входит и не продлевает вход, напрямую - входит', async () => {
      const viaProxy = createClient();
      viaProxy.beforeSend = (requestUrl, options) => {
        options.headers = { ...options.headers, 'X-Forwarded-For': PROXY_CLIENT_IP };
        return { url: requestUrl, options };
      };
      const authSuperuser = (client: PocketBase, collection: string): Promise<unknown> =>
        client.collection(collection).authWithPassword(SUPERUSER.email, SUPERUSER.password);
      await expect(authSuperuser(viaProxy, Collections.Superusers)).rejects.toThrow();
      await expect(authSuperuser(viaProxy, SUPERUSERS_COLLECTION_ID)).rejects.toThrow();

      const direct = createClient();
      await authSuperuser(direct, Collections.Superusers);
      viaProxy.authStore.save(direct.authStore.token, direct.authStore.record);
      await expect(viaProxy.collection(Collections.Superusers).authRefresh()).rejects.toThrow();

      // обычные пользователи через прокси входят как прежде
      const user = createClient();
      user.beforeSend = viaProxy.beforeSend;
      await user.collection(Collections.Users).authWithPassword('dave', PASSWORD);
    });
  });

  describe('пользователи', () => {
    it('регистрации нет, заводит только главный', async () => {
      const anonClient = createClient();
      const newUserBody = {
        username: 'eve',
        name: 'Eve',
        password: PASSWORD,
        passwordConfirm: PASSWORD,
      };
      await expect(
        getCollection(anonClient, Collections.Users).create(newUserBody),
      ).rejects.toThrow();
      await expect(
        getCollection(getUser('bob').client, Collections.Users).create(newUserBody),
      ).rejects.toThrow();
    });

    it('себе - имя, но не права главного и не логин', async () => {
      const bob = getUser('bob');
      const usersCollection = getCollection(bob.client, Collections.Users);
      expect((await usersCollection.update(bob.id, { name: 'Боб' })).name).toBe('Боб');
      await expect(usersCollection.update(bob.id, { is_admin: true })).rejects.toThrow();
      await expect(usersCollection.update(bob.id, { username: 'robert' })).rejects.toThrow();
    });

    it('свой аватар: файл закрыт, с токеном открывается и уменьшается', async () => {
      const bob = getUser('bob');
      const avatarPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64',
      );
      const form = new FormData();
      form.set('avatar', new Blob([avatarPng], { type: PNG_TYPE }), 'me.png');
      const me = await getCollection(bob.client, Collections.Users).update(bob.id, form);
      expect(me.avatar).toBeTruthy();
      const openResponse = await fetch(bob.client.files.getURL(me, me.avatar));
      expect(openResponse.status).not.toBe(200);
      const token = await getUser('konan').client.files.getToken();
      const thumbUrl = bob.client.files.getURL(me, me.avatar, { token, thumb: THUMB_SIZE });
      const thumb = await fetch(thumbUrl);
      expect(thumb.status).toBe(200);
      const otherForm = new FormData();
      otherForm.set('avatar', new Blob([avatarPng], { type: PNG_TYPE }), 'x.png');
      await expect(
        getCollection(getUser('carol').client, Collections.Users).update(bob.id, otherForm),
      ).rejects.toThrow();
    });

    it('логин уникален', async () => {
      await expect(
        getCollection(getUser('konan').client, Collections.Users).create({
          username: 'bob',
          name: 'Второй',
          password: PASSWORD,
          passwordConfirm: PASSWORD,
        }),
      ).rejects.toThrow();
    });

    it('главный задаёт пароль другому без старого; себе и не главный - только со старым', async () => {
      const konan = getUser('konan');
      const newPasswordBody = { password: NEW_PASSWORD, passwordConfirm: NEW_PASSWORD };
      const frank = await getCollection(konan.client, Collections.Users).create({
        username: 'frank',
        name: 'Frank',
        password: PASSWORD,
        passwordConfirm: PASSWORD,
      });
      const session = createClient();
      await session.collection(Collections.Users).authWithPassword('frank', PASSWORD);

      // не главный: чужой пароль не задать, свой - только со старым
      await expect(
        getCollection(getUser('bob').client, Collections.Users).update(frank.id, newPasswordBody),
      ).rejects.toThrow();
      const bob = getUser('bob');
      await expect(
        getCollection(bob.client, Collections.Users).update(bob.id, newPasswordBody),
      ).rejects.toThrow();
      await getCollection(konan.client, Collections.Users).update(frank.id, newPasswordBody);

      // прежние сессии закрыты, вход - только с новым паролем
      await expect(session.collection(Collections.Users).authRefresh()).rejects.toThrow();
      await expect(
        createClient().collection(Collections.Users).authWithPassword('frank', PASSWORD),
      ).rejects.toThrow();
      await createClient().collection(Collections.Users).authWithPassword('frank', NEW_PASSWORD);

      // себе - только со старым паролем; поля 2FA и скрытые поля главному по-прежнему закрыты
      await expect(
        getCollection(konan.client, Collections.Users).update(konan.id, newPasswordBody),
      ).rejects.toThrow();
      await expect(
        getCollection(konan.client, Collections.Users).update(frank.id, { totp_enabled: true }),
      ).rejects.toThrow();
      const seen = await getCollection(konan.client, Collections.Users).getOne(frank.id);
      expect(seen).not.toHaveProperty('totp_secret');
      expect(seen.totp_enabled).toBe(false);
    });

    // Удаление из раздела "Пользователи" (src/pages/admin-users.tsx): при отказе интерфейс пишет
    // "возможно, он владелец проекта или автор записей". Связи на users: owner проекта и author
    // заметок, задач и публикаций - обязательные и без каскада, поэтому PocketBase отказывает
    // (400); роли в проектах и исполнители - необязательные, человек из них просто убирается.
    it('удаление: только главный и не себя; из ролей и исполнителей убирается, владельца и автора - нет', async () => {
      const konan = getUser('konan');
      const usersCollection = getCollection(konan.client, Collections.Users);
      const kate = await createEnrolledUser('kate');
      const liam = await createEnrolledUser('liam');
      const mona = await createEnrolledUser('mona');
      await usersCollection.update(mona.id, { can_create_projects: true });
      const ownProject = await createProject(mona.client, {
        name: 'Удаление',
        owner: mona.id,
        roles: { [ProjectRole.Editor]: [kate.id], [ProjectRole.Contributor]: [liam.id] },
      });
      const song = await createSong(mona.client, ownProject.id, 'Песня', []);
      const stages = getCollection(mona.client, Collections.SongStages);
      const stage = await stages.create({
        song: song.id,
        title: 'Запись',
        position: 0,
        status: StageStatus.not_started,
        assignees: [kate.id, liam.id],
      });
      const tasks = getCollection(mona.client, Collections.Tasks);
      const task = await createTask(mona.client, {
        project: ownProject.id,
        title: 'Задача',
        author: mona.id,
        // единственный исполнитель: каскад по списку удалил бы задачу только при пустом списке
        assignees: [kate.id],
      });
      const posts = getCollection(mona.client, Collections.Posts);
      const post = await createPost(mona.client, {
        project: ownProject.id,
        title: 'Пост',
        author: mona.id,
        anchor: PostAnchor.date,
        offset: 0,
        platforms: [],
        assignees: [kate.id, liam.id],
      });
      const projects = getCollection(mona.client, Collections.Projects);

      // не главный чужую запись не видит для удаления, себя не удалить никому, и главному тоже
      const bobUsers = getCollection(getUser('bob').client, Collections.Users);
      expect(await getRejectionStatus(bobUsers.delete(kate.id))).toBe(404);
      const kateUsers = getCollection(kate.client, Collections.Users);
      expect(await getRejectionStatus(kateUsers.delete(kate.id))).toBe(404);
      expect(await getRejectionStatus(usersCollection.delete(konan.id))).toBe(404);
      expect((await usersCollection.getOne(kate.id)).username).toBe('kate');

      // редактор и исполнитель без своих записей: удаляется, из ролей и исполнителей убран,
      // проект и записи на месте, его сессия закрыта
      await usersCollection.delete(kate.id);
      await expect(usersCollection.getOne(kate.id)).rejects.toThrow();
      await expect(kate.client.collection(Collections.Users).authRefresh()).rejects.toThrow();
      const projectAfter = await projects.getOne(ownProject.id);
      expect([projectAfter.owner, projectAfter.editors, projectAfter.contributors]).toEqual([
        mona.id,
        [],
        [liam.id],
      ]);
      expect((await stages.getOne(stage.id)).assignees).toEqual([liam.id]);
      expect((await tasks.getOne(task.id)).assignees).toEqual([]);
      expect((await posts.getOne(post.id)).assignees).toEqual([liam.id]);

      // автор заметки, задачи или публикации: отказ целиком - роль и назначения остаются
      const expectLiamRefused = async (): Promise<void> => {
        expect(await getRejectionStatus(usersCollection.delete(liam.id))).toBe(400);
        expect((await usersCollection.getOne(liam.id)).username).toBe('liam');
        expect((await projects.getOne(ownProject.id)).contributors).toEqual([liam.id]);
        expect((await stages.getOne(stage.id)).assignees).toEqual([liam.id]);
        expect((await posts.getOne(post.id)).assignees).toEqual([liam.id]);
      };
      const note = await createNote(liam.client, { project: ownProject.id }, liam.id, {
        text: 'от liam',
      });
      await expectLiamRefused();
      await getCollection(liam.client, Collections.Notes).delete(note.id);
      const taskByLiam = await createTask(liam.client, {
        project: ownProject.id,
        title: 'от liam',
        author: liam.id,
      });
      await expectLiamRefused();
      await getCollection(liam.client, Collections.Tasks).delete(taskByLiam.id);
      const postByLiam = await createPost(liam.client, {
        project: ownProject.id,
        title: 'от liam',
        author: liam.id,
        anchor: PostAnchor.date,
        offset: 0,
        platforms: [],
      });
      await expectLiamRefused();
      await getCollection(liam.client, Collections.Posts).delete(postByLiam.id);
      // своих записей не осталось - удаляется
      await usersCollection.delete(liam.id);
      expect((await projects.getOne(ownProject.id)).contributors).toEqual([]);
      expect((await stages.getOne(stage.id)).assignees).toEqual([]);
      expect((await posts.getOne(post.id)).assignees).toEqual([]);

      // владелец проекта: отказ, проект с владельцем на месте; передать проект нельзя, так что
      // сначала владелец удаляет свои проекты сам. Своих задачи и публикации у mona уже нет:
      // отказ - именно из-за проекта
      await tasks.delete(task.id);
      await posts.delete(post.id);
      expect(await getRejectionStatus(usersCollection.delete(mona.id))).toBe(400);
      expect((await projects.getOne(ownProject.id)).owner).toBe(mona.id);
      await projects.delete(ownProject.id);
      await usersCollection.delete(mona.id);
      await expect(usersCollection.getOne(mona.id)).rejects.toThrow();
    });

    it('отключение: вход и сессии закрыты, записи и роли остаются; включает и отключает только главный, не себя', async () => {
      const konan = getUser('konan');
      const usersCollection = getCollection(konan.client, Collections.Users);
      const nina = await createSignedInUser('nina');
      const secret = await enrollTotp(nina);
      const ninaId = nina.authStore.record?.id ?? '';
      const omar = await createSignedInUser('omar');
      const omarId = omar.authStore.record?.id ?? '';
      const ownProject = await createProject(getUser('bob').client, {
        name: 'Отключение',
        owner: getUser('bob').id,
        roles: { [ProjectRole.Contributor]: [ninaId] },
      });
      const note = await createNote(nina, { project: ownProject.id }, ninaId, { text: 'от nina' });

      // поле не меняют ни себе, ни другим без прав главного; главный - не себе
      const ninaUsers = getCollection(nina, Collections.Users);
      await expect(ninaUsers.update(ninaId, { disabled: true })).rejects.toThrow();
      expect(await getRejectionStatus(ninaUsers.update(omarId, { disabled: true }))).toBe(404);
      await expect(usersCollection.update(konan.id, { disabled: true })).rejects.toThrow();
      expect((await usersCollection.getOne(konan.id)).disabled).toBe(false);
      // своё имя главный по-прежнему меняет
      await usersCollection.update(konan.id, { name: 'Konan' });

      await usersCollection.update(ninaId, { disabled: true });
      // прежняя сессия закрыта
      await expect(nina.collection(Collections.Users).authRefresh()).rejects.toThrow();
      // вход: неверный пароль - обычный отказ, верные пароль и код - "отключена"
      const loginNina = (password: string): Promise<unknown> => {
        const code = totp.getCode(secret, getUnixNow() + TOTP_STEP_SECONDS);
        return createClient()
          .collection(Collections.Users)
          .authWithPassword('nina', password, { body: { identity: 'nina', password, code } });
      };
      expect(getErrorCode(await getRejection(loginNina(WRONG_PASSWORD)))).toBe('');
      expect(getErrorCode(await getRejection(loginNina(PASSWORD)))).toBe('user_disabled');
      // записи и роль на месте
      const bobClient = getUser('bob').client;
      const savedNote = await getCollection(bobClient, Collections.Notes).getOne(note.id);
      expect(savedNote.author).toBe(ninaId);
      const savedProject = await getCollection(bobClient, Collections.Projects).getOne(
        ownProject.id,
      );
      expect(savedProject.contributors).toEqual([ninaId]);

      // включение возвращает вход (omar - без 2FA, вход паролем)
      await usersCollection.update(omarId, { disabled: true });
      const disabledLogin = await getRejection(
        createClient().collection(Collections.Users).authWithPassword('omar', PASSWORD),
      );
      expect(getErrorCode(disabledLogin)).toBe('user_disabled');
      await usersCollection.update(omarId, { disabled: false });
      const back = createClient();
      await back.collection(Collections.Users).authWithPassword('omar', PASSWORD);
      expect(back.authStore.isValid).toBe(true);
    });
  });

  describe('проекты', () => {
    it('проект видят владелец и участники, остальные - нет', async () => {
      const getVisibleProjectIds = async (name: string): Promise<string[]> => {
        const visible = await getCollection(
          getUser(name).client,
          Collections.Projects,
        ).getFullList();
        return visible.map((visibleProject) => visibleProject.id);
      };
      expect(await getVisibleProjectIds('bob')).toContain(project.id);
      expect(await getVisibleProjectIds('konan')).toContain(project.id);
      expect(await getVisibleProjectIds('carol')).not.toContain(project.id);
    });

    it('новый проект пустой: шаблона этапов нет', async () => {
      const bob = getUser('bob');
      const fresh = await createProject(bob.client, { name: 'Пустой', owner: bob.id });
      const freshTemplates = await getCollection(
        bob.client,
        Collections.StageTemplates,
      ).getFullList({ filter: getProjectFilter(bob.client, fresh.id) });
      expect(freshTemplates).toHaveLength(0);
      const song = await createSong(bob.client, fresh.id, 'Без этапов', []);
      const stages = await getCollection(bob.client, Collections.SongStages).getFullList({
        filter: getSongFilter(bob.client, song.id),
      });
      expect(stages).toHaveLength(0);
    });

    it('аватар проекта меняет только владелец', async () => {
      const form = new FormData();
      form.set('avatar', createPngFile('logo.png'));
      const updated = await getCollection(getUser('bob').client, Collections.Projects).update(
        project.id,
        form,
      );
      expect(updated.avatar).toMatch(/\.png$/);
      const again = new FormData();
      again.set('avatar', createPngFile('other.png'));
      await expect(
        getCollection(getUser('konan').client, Collections.Projects).update(project.id, again),
      ).rejects.toThrow();
    });

    it('участниками управляет только владелец', async () => {
      const carol = getUser('carol');
      await expect(
        getCollection(getUser('konan').client, Collections.Projects).update(project.id, {
          'editors+': carol.id,
        }),
      ).rejects.toThrow();
      await expect(
        getCollection(getUser('bob').client, Collections.Projects).update(project.id, {
          owner: carol.id,
        }),
      ).rejects.toThrow();
    });

    it('чужой проект не создать', async () => {
      await expect(
        createProject(getUser('carol').client, { name: 'Подлог', owner: getUser('bob').id }),
      ).rejects.toThrow();
    });

    it('песня создаётся с этапами и подэтапами шаблона и видна только проекту', async () => {
      const song = await createSong(getUser('konan').client, project.id, 'With me', templates);
      const stages = await getCollection(getUser('bob').client, Collections.SongStages).getFullList(
        {
          filter: getSongFilter(getUser('bob').client, song.id),
          sort: 'position',
        },
      );
      expect(stages.map((stage) => stage.title)).toEqual(['Демо', 'Запись']);
      expect(stages[1]?.substeps).toMatchObject([
        { title: 'Бас', done: false },
        { title: 'Вокал', done: false },
      ]);
      const areAllNotStarted = stages.every((stage) => stage.status === StageStatus.not_started);
      expect(areAllNotStarted).toBe(true);
      await expect(
        getCollection(getUser('carol').client, Collections.Songs).getOne(song.id),
      ).rejects.toThrow();
      await expect(
        createSong(getUser('carol').client, project.id, 'Чужая', templates),
      ).rejects.toThrow();
    });

    it('песне без этапов редактор добавляет этапы шаблона; не участник проекта - нет', async () => {
      const song = await createSong(getUser('konan').client, project.id, 'Без этапов', []);
      await createStagesFromTemplate(getUser('konan').client, song.id, templates);
      const stages = await getCollection(getUser('bob').client, Collections.SongStages).getFullList(
        {
          filter: getSongFilter(getUser('bob').client, song.id),
          sort: 'position',
        },
      );
      expect(stages.map((stage) => [stage.title, stage.position, stage.status])).toEqual([
        ['Демо', 0, StageStatus.not_started],
        ['Запись', 1, StageStatus.not_started],
      ]);
      expect(stages[1]?.substeps).toMatchObject([{ title: 'Бас' }, { title: 'Вокал' }]);
      await expect(
        createStagesFromTemplate(getUser('carol').client, song.id, templates),
      ).rejects.toThrow();
    });

    it('новая песня встаёт в начало ручного порядка', async () => {
      const first = await createSong(getUser('bob').client, project.id, 'Первая', []);
      const second = await createSong(getUser('bob').client, project.id, 'Вторая', []);
      expect(second.position).toBeLessThan(first.position ?? 0);
      await savePositions(getUser('bob').client, Collections.Songs, [
        { id: first.id, position: first.position ?? 0 },
        { id: second.id, position: second.position ?? 0 },
      ]);
      const list = await getCollection(getUser('bob').client, Collections.Songs).getFullList({
        filter: getUser('bob').client.filter('id = {:firstId} || id = {:secondId}', {
          firstId: first.id,
          secondId: second.id,
        }),
        sort: 'position',
      });
      expect(list.map((song) => song.title)).toEqual(['Первая', 'Вторая']);
      await expect(
        getCollection(getUser('carol').client, Collections.Songs).update(first.id, { position: 5 }),
      ).rejects.toThrow();
    });

    it('статуса "на проверке" больше нет', async () => {
      const bob = getUser('bob');
      const song = await createSong(bob.client, project.id, 'Статусы', templates);
      const stage = await getCollection(bob.client, Collections.SongStages).getFirstListItem(
        getSongFilter(bob.client, song.id),
      );
      await expect(
        getCollection(bob.client, Collections.SongStages).update(stage.id, { status: 'review' }),
      ).rejects.toThrow();
      expect(
        (
          await getCollection(bob.client, Collections.SongStages).update(stage.id, {
            status: StageStatus.done,
          })
        ).status,
      ).toBe(StageStatus.done);
    });
  });

  describe('роли', () => {
    let shared: Project;
    let song: Song;
    let stageId = '';

    beforeAll(async () => {
      const bob = getUser('bob');
      shared = await createProject(bob.client, {
        name: 'Роли',
        owner: bob.id,
        roles: {
          [ProjectRole.Editor]: [getUser('konan').id],
          [ProjectRole.Contributor]: [getUser('carol').id],
          [ProjectRole.Viewer]: [getUser('erin').id],
        },
      });
      song = await createSong(bob.client, shared.id, 'Общая', templates.slice(0, 1));
      const stage = await getCollection(bob.client, Collections.SongStages).getFirstListItem(
        getSongFilter(bob.client, song.id),
      );
      stageId = stage.id;
    });

    it('промо-план: у нового проекта готовый набор, правят редакторы, участник и наблюдатель - нет', async () => {
      const getPromoSteps = (client: PocketBase): Promise<PromoTemplatesResponse[]> =>
        getCollection(client, Collections.PromoTemplates).getFullList({
          filter: getProjectFilter(client, shared.id),
          sort: 'offset',
        });
      const steps = await getPromoSteps(getUser('erin').client);
      expect(steps.map((step) => step.offset)).toEqual([-14, -7, -1, 0, 3, 7]);
      const release = steps.find((step) => step.offset === 0);
      expect(release?.title).toBe('Релиз');
      expect(release?.comment).toBe('Ссылка на bandlink');
      const first = steps[0];
      if (!first) {
        throw new Error('нет шага');
      }
      const konanSteps = getCollection(getUser('konan').client, Collections.PromoTemplates);
      const renamed = await konanSteps.update(first.id, { title: 'Анонс', offset: -10 });
      expect(renamed.offset).toBe(-10);
      await expect(
        getCollection(getUser('carol').client, Collections.PromoTemplates).update(first.id, {
          title: 'x',
        }),
      ).rejects.toThrow();
      await expect(
        getCollection(getUser('erin').client, Collections.PromoTemplates).create({
          project: shared.id,
          title: 'x',
          offset: 0,
        }),
      ).rejects.toThrow();
      await expect(konanSteps.update(first.id, { offset: 400 })).rejects.toThrow();
      expect(await getPromoSteps(getUser('dave').client)).toEqual([]);
    });

    it('создавать проекты - главный и те, кому он разрешил; себе не разрешить', async () => {
      const erin = getUser('erin');
      await expect(
        createProject(erin.client, { name: 'Нельзя', owner: erin.id }),
      ).rejects.toThrow();
      await expect(
        getCollection(erin.client, Collections.Users).update(erin.id, {
          can_create_projects: true,
        }),
      ).rejects.toThrow();
      await getCollection(getUser('konan').client, Collections.Users).update(erin.id, {
        can_create_projects: true,
      });
      const ownProject = await createProject(erin.client, { name: 'Можно', owner: erin.id });
      expect(ownProject.owner).toBe(erin.id);
      await getCollection(erin.client, Collections.Projects).delete(ownProject.id);
      await getCollection(getUser('konan').client, Collections.Users).update(erin.id, {
        can_create_projects: false,
      });
    });

    it('у человека в проекте одна роль', async () => {
      await expect(
        getCollection(getUser('bob').client, Collections.Projects).update(shared.id, {
          viewers: [getUser('erin').id, getUser('carol').id],
        }),
      ).rejects.toThrow();
      await expect(
        getCollection(getUser('bob').client, Collections.Projects).update(shared.id, {
          'editors+': getUser('bob').id,
        }),
      ).rejects.toThrow();
    });

    it('наблюдатель только смотрит', async () => {
      const erin = getUser('erin').client;
      expect((await getCollection(erin, Collections.Songs).getOne(song.id)).title).toBe('Общая');
      await expect(
        getCollection(erin, Collections.SongStages).update(stageId, {
          status: StageStatus.in_progress,
        }),
      ).rejects.toThrow();
      await expect(
        createNote(erin, { project: shared.id }, getUser('erin').id, { text: 'нельзя' }),
      ).rejects.toThrow();
      await expect(createSong(erin, shared.id, 'Нельзя', [])).rejects.toThrow();
    });

    it('участник: статус, срок и подэтапы этапа, заметки; песни и состав этапов - нет', async () => {
      const carol = getUser('carol').client;
      const stages = getCollection(carol, Collections.SongStages);
      expect((await stages.update(stageId, { status: StageStatus.in_progress })).status).toBe(
        StageStatus.in_progress,
      );
      await stages.update(stageId, {
        substeps: [{ id: 'x00000000000001', title: 'Дубль', done: true }],
      });
      await expect(stages.update(stageId, { title: 'Переименован' })).rejects.toThrow();
      await expect(stages.update(stageId, { position: 5 })).rejects.toThrow();
      await expect(stages.delete(stageId)).rejects.toThrow();
      await expect(
        stages.create({
          song: song.id,
          title: 'Новый',
          position: 9,
          status: StageStatus.not_started,
        }),
      ).rejects.toThrow();
      await expect(
        getCollection(carol, Collections.Songs).update(song.id, { title: 'Другое' }),
      ).rejects.toThrow();
      await expect(createSong(carol, shared.id, 'Нельзя', [])).rejects.toThrow();
      const note = await createNote(
        carol,
        { project: shared.id, song: song.id },
        getUser('carol').id,
        {
          text: 'дубль 3 лучший',
        },
      );
      expect(note.author).toBe(getUser('carol').id);
      await expect(
        getCollection(carol, Collections.StageTemplates).create({
          project: shared.id,
          title: 'x',
          position: 0,
        }),
      ).rejects.toThrow();
    });

    it('редактор: песни и чужие заметки; участники и название проекта - только владелец', async () => {
      const konan = getUser('konan').client;
      const mine = await createSong(konan, shared.id, 'От редактора', []);
      await getCollection(konan, Collections.Songs).update(mine.id, { title: 'Переименована' });
      await getCollection(konan, Collections.SongStages).update(stageId, {
        title: 'Демо 2',
        position: 0,
      });
      const carol = getUser('carol');
      const carolNote = await createNote(carol.client, { project: shared.id }, carol.id, {
        text: 'удалит редактор',
      });
      await expect(
        getCollection(getUser('erin').client, Collections.Notes).delete(carolNote.id),
      ).rejects.toThrow();
      await getCollection(konan, Collections.Notes).delete(carolNote.id);
      await expect(
        getCollection(konan, Collections.Projects).update(shared.id, { name: 'Чужое' }),
      ).rejects.toThrow();
      await expect(
        getCollection(konan, Collections.Projects).update(shared.id, { viewers: [] }),
      ).rejects.toThrow();
    });

    it('наблюдатель, ставший из участника, свою заметку не правит', async () => {
      const carol = getUser('carol');
      const note = await createNote(carol.client, { project: shared.id }, carol.id, {
        text: 'раз',
      });
      await getCollection(getUser('bob').client, Collections.Projects).update(shared.id, {
        contributors: [],
        viewers: [getUser('erin').id, carol.id],
      });
      await expect(
        getCollection(carol.client, Collections.Notes).update(note.id, { text: 'два' }),
      ).rejects.toThrow();
      expect((await getCollection(carol.client, Collections.Notes).getOne(note.id)).text).toBe(
        'раз',
      );
      await getCollection(getUser('bob').client, Collections.Projects).update(shared.id, {
        contributors: [carol.id],
        viewers: [getUser('erin').id],
      });
    });
  });

  describe('планировщик', () => {
    let plan: Project;
    beforeAll(async () => {
      const bob = getUser('bob');
      plan = await createProject(bob.client, {
        name: 'План',
        owner: bob.id,
        roles: {
          [ProjectRole.Contributor]: [getUser('carol').id],
          [ProjectRole.Viewer]: [getUser('erin').id],
        },
      });
    });

    it('задачи ведут участники; наблюдатель только видит', async () => {
      const carol = getUser('carol');
      const task = await createTask(carol.client, {
        project: plan.id,
        title: 'Купить струны',
        author: carol.id,
        assignees: [carol.id, getUser('bob').id],
      });
      expect(task.done).toBe(false);
      const erin = getUser('erin').client;
      expect((await getCollection(erin, Collections.Tasks).getOne(task.id)).title).toBe(
        'Купить струны',
      );
      await expect(
        getCollection(erin, Collections.Tasks).update(task.id, { done: true }),
      ).rejects.toThrow();
      await expect(
        createTask(erin, { project: plan.id, title: 'нельзя', author: getUser('erin').id }),
      ).rejects.toThrow();
      await expect(
        getCollection(getUser('dave').client, Collections.Tasks).getOne(task.id),
      ).rejects.toThrow();
      await expect(
        createTask(carol.client, {
          project: plan.id,
          title: 'за другого',
          author: getUser('bob').id,
        }),
      ).rejects.toThrow();
    });

    it('время выполнения ставит сервер, снятие отметки его стирает', async () => {
      const bob = getUser('bob');
      const task = await createTask(bob.client, {
        project: plan.id,
        title: 'Сдать мастер',
        author: bob.id,
      });
      const done = await getCollection(bob.client, Collections.Tasks).update(task.id, {
        done: true,
      });
      expect(done.done_at).toBeTruthy();
      const undone = await getCollection(bob.client, Collections.Tasks).update(task.id, {
        done: false,
      });
      expect(undone.done_at).toBe('');
    });

    it('песня задачи - только из того же проекта; удалили песню - задача осталась', async () => {
      const bob = getUser('bob');
      const foreign = await createSong(bob.client, project.id, 'Чужая для плана', []);
      await expect(
        createTask(bob.client, { project: plan.id, title: 'x', author: bob.id, song: foreign.id }),
      ).rejects.toThrow();
      const ownSong = await createSong(bob.client, plan.id, 'Своя', []);
      const task = await createTask(bob.client, {
        project: plan.id,
        title: 'Обложка',
        author: bob.id,
        song: ownSong.id,
      });
      const other = await createSong(bob.client, plan.id, 'Другая', []);
      const moved = await getCollection(bob.client, Collections.Tasks).update(task.id, {
        song: other.id,
      });
      expect(moved.song).toBe(other.id);
      await expect(
        getCollection(bob.client, Collections.Tasks).update(task.id, { song: foreign.id }),
      ).rejects.toThrow();
      await getCollection(bob.client, Collections.Tasks).update(task.id, { song: ownSong.id });
      await getCollection(bob.client, Collections.Songs).delete(ownSong.id);
      const after = await getCollection(bob.client, Collections.Tasks).getOne(task.id);
      expect(after.song).toBe('');
    });

    it('исполнители - кто работает в проекте; назначенный раньше остаётся', async () => {
      const bob = getUser('bob');
      const carol = getUser('carol');
      const erin = getUser('erin');
      const team = await createProject(bob.client, {
        name: 'Исполнители',
        owner: bob.id,
        roles: {
          [ProjectRole.Editor]: [getUser('konan').id],
          [ProjectRole.Contributor]: [carol.id],
          [ProjectRole.Viewer]: [erin.id],
        },
      });
      const expectNotWorker = async (request: Promise<unknown>): Promise<void> => {
        expect(getErrorCode(await getRejection(request), 'assignees')).toBe('not_worker');
      };
      const createTeamTask = (assignees: string[]): Promise<Task> =>
        createTask(bob.client, { project: team.id, title: 'x', author: bob.id, assignees });
      // наблюдатель и посторонний (dave вне проекта) - нет
      await expectNotWorker(createTeamTask([bob.id, erin.id]));
      await expectNotWorker(createTeamTask([getUser('dave').id]));
      const createTeamPost = (assignees: string[]): Promise<Post> =>
        createPost(bob.client, {
          project: team.id,
          title: 'x',
          author: bob.id,
          anchor: PostAnchor.date,
          offset: 0,
          platforms: [],
          assignees,
        });
      await expectNotWorker(createTeamPost([erin.id]));
      const teamTask = await createTeamTask([bob.id, carol.id, getUser('konan').id]);
      const teamPost = await createTeamPost([carol.id]);
      const song = await createSong(bob.client, team.id, 'Этап', templates.slice(0, 1));
      const stages = getCollection(carol.client, Collections.SongStages);
      const stage = await stages.getFirstListItem(getSongFilter(carol.client, song.id));
      await expectNotWorker(stages.update(stage.id, { assignees: [carol.id, erin.id] }));
      await stages.update(stage.id, { assignees: [carol.id] });
      await expectNotWorker(
        getCollection(bob.client, Collections.Posts).update(teamPost.id, { 'assignees+': erin.id }),
      );

      // carol перевели в наблюдатели: там, где она уже исполнитель, она остаётся, и записи
      // правятся; заново её не назначить
      await getCollection(bob.client, Collections.Projects).update(team.id, {
        contributors: [],
        viewers: [erin.id, carol.id],
      });
      const tasks = getCollection(bob.client, Collections.Tasks);
      expect((await tasks.update(teamTask.id, { title: 'Переименована' })).assignees).toContain(
        carol.id,
      );
      const fewer = await tasks.update(teamTask.id, { assignees: [carol.id, bob.id] });
      expect(fewer.assignees).toEqual([carol.id, bob.id]);
      await expectNotWorker(tasks.update(teamTask.id, { assignees: [carol.id, bob.id, erin.id] }));
      const startedStage = await getCollection(bob.client, Collections.SongStages).update(
        stage.id,
        {
          status: StageStatus.in_progress,
        },
      );
      expect(startedStage.assignees).toEqual([carol.id]);
      const readyPost = await getCollection(bob.client, Collections.Posts).update(teamPost.id, {
        status: PostStatus.ready,
      });
      expect(readyPost.status).toBe(PostStatus.ready);
      const cleared = await tasks.update(teamTask.id, { assignees: [bob.id] });
      await expectNotWorker(tasks.update(cleared.id, { 'assignees+': carol.id }));
    });

    it('исполнителей этапа (нескольких) ставит и участник', async () => {
      const bob = getUser('bob');
      const song = await createSong(bob.client, plan.id, 'С этапом', templates.slice(0, 1));
      const stage = await getCollection(bob.client, Collections.SongStages).getFirstListItem(
        getSongFilter(bob.client, song.id),
      );
      const updated = await getCollection(getUser('carol').client, Collections.SongStages).update(
        stage.id,
        {
          assignees: [getUser('carol').id, getUser('bob').id],
        },
      );
      expect(updated.assignees).toEqual([getUser('carol').id, getUser('bob').id]);
    });
  });

  describe('песня и контент-план', () => {
    it('тональность - только из списка, темп - целое 20..400', async () => {
      const songs = getCollection(getUser('bob').client, Collections.Songs);
      const song = await createSong(getUser('bob').client, project.id, 'Тон', []);
      for (const key of ['Am', 'F#', 'G#m', 'Bbm', '']) {
        expect((await songs.update(song.id, { key })).key).toBe(key);
      }
      for (const key of ['ля минор', 'H', 'Abm', 'Am7', 'что угодно']) {
        await expect(songs.update(song.id, { key })).rejects.toThrow();
      }
      for (const bpm of [10, 401, 120.5]) {
        await expect(songs.update(song.id, { bpm })).rejects.toThrow();
      }
      expect((await songs.update(song.id, { bpm: 128 })).bpm).toBe(128);
    });

    it('новая песня не начата; первый начатый этап - в работе', async () => {
      const bob = getUser('bob');
      const song = await createSong(bob.client, project.id, 'Свежая', templates.slice(0, 1));
      expect(song.status).toBe(SongStatus.not_started);
      const stage = await getCollection(bob.client, Collections.SongStages).getFirstListItem(
        getSongFilter(bob.client, song.id),
      );
      await getCollection(bob.client, Collections.SongStages).update(stage.id, {
        status: StageStatus.in_progress,
      });
      expect((await getCollection(bob.client, Collections.Songs).getOne(song.id)).status).toBe(
        SongStatus.active,
      );
      // вручную можно вернуть "не начата"
      expect(
        (
          await getCollection(bob.client, Collections.Songs).update(song.id, {
            status: SongStatus.not_started,
          })
        ).status,
      ).toBe(SongStatus.not_started);
    });

    it('ссылки проекта правит владелец', async () => {
      const links = [{ service: 'spotify', url: 'https://open.spotify.com/artist/x' }];
      const updated = await getCollection(getUser('bob').client, Collections.Projects).update(
        project.id,
        {
          links,
        },
      );
      expect(updated.links).toEqual(links);
      await expect(
        getCollection(getUser('konan').client, Collections.Projects).update(project.id, {
          links: [],
        }),
      ).rejects.toThrow();
    });

    it('публикации: от релиза своей песни, ведут участники проекта', async () => {
      const bob = getUser('bob');
      const song = await createSong(bob.client, project.id, 'Промо', []);
      const post = await createPost(bob.client, {
        project: project.id,
        title: 'Тизер',
        author: bob.id,
        song: song.id,
        anchor: PostAnchor.release,
        offset: -7,
        platforms: ['instagram', 'tiktok'],
      });
      expect(post.offset).toBe(-7);
      expect(post.platforms).toEqual(['instagram', 'tiktok']);
      const published = await getCollection(getUser('konan').client, Collections.Posts).update(
        post.id,
        {
          status: PostStatus.published,
        },
      );
      expect(published.status).toBe(PostStatus.published);
      await expect(
        getCollection(getUser('carol').client, Collections.Posts).getOne(post.id),
      ).rejects.toThrow();
      const other = await createProject(bob.client, { name: 'Другой', owner: bob.id });
      const foreign = await createSong(bob.client, other.id, 'Чужая', []);
      await expect(
        getCollection(bob.client, Collections.Posts).update(post.id, { song: foreign.id }),
      ).rejects.toThrow();
    });
  });

  describe('заметки', () => {
    it('заметка у проекта, песни и этапа; раздел "Все заметки" находит все три', async () => {
      const bob = getUser('bob');
      const song = await createSong(bob.client, project.id, 'Линии страсти', templates);
      const stage = await getCollection(bob.client, Collections.SongStages).getFirstListItem(
        bob.client.filter('song = {:songId} && position = 1', { songId: song.id }),
      );
      const projectNote = await createNote(bob.client, { project: project.id }, bob.id, {
        text: 'Кавер в 6/8',
      });
      const songNote = await createNote(
        bob.client,
        { project: project.id, song: song.id },
        bob.id,
        {
          text: 'Припев длинноват',
        },
      );
      const stageNote = await createNote(
        bob.client,
        { project: project.id, song: song.id, stage: stage.id },
        bob.id,
        {
          text: 'Бас через Ampeg #тёплый',
          images: [createPngFile('amp.png')],
        },
      );
      expect([projectNote.song, songNote.song, stageNote.stage]).toEqual(['', song.id, stage.id]);
      expect(stageNote.expand?.stage?.title).toBe('Запись');

      const findNoteIds = async (patch: Partial<NotesFilter>): Promise<string[]> => {
        const filter = getNotesFilter(bob.client, project.id, { ...EMPTY_NOTES_FILTER, ...patch });
        const found = await getCollection(bob.client, Collections.Notes).getFullList({ filter });
        return found.map((note) => note.id);
      };
      expect(await findNoteIds({ song: song.id })).toEqual(
        expect.arrayContaining([songNote.id, stageNote.id]),
      );
      expect(await findNoteIds({ level: NoteLevel.Project })).toContain(projectNote.id);
      expect(await findNoteIds({ level: NoteLevel.Project })).not.toContain(songNote.id);
      expect(await findNoteIds({ level: NoteLevel.Stage, text: 'ampeg' })).toEqual([stageNote.id]);
      expect(await findNoteIds({ hasImages: true, song: song.id })).toEqual([stageNote.id]);
      expect(await findNoteIds({ text: 'тёплый' })).toEqual([stageNote.id]);
    });

    it('автор - только сам пишущий; песня - из того же проекта', async () => {
      const bob = getUser('bob');
      await expect(
        createNote(bob.client, { project: project.id }, getUser('konan').id, { text: 'x' }),
      ).rejects.toThrow();
      const other = await createProject(bob.client, { name: 'Другой', owner: bob.id });
      const foreign = await createSong(bob.client, other.id, 'Не отсюда', []);
      await expect(
        createNote(bob.client, { project: project.id, song: foreign.id }, bob.id, { text: 'x' }),
      ).rejects.toThrow();
    });

    it('чужую заметку не переписать (удалить может редактор - см. роли)', async () => {
      const bob = getUser('bob');
      const note = await createNote(bob.client, { project: project.id }, bob.id, {
        text: 'Оригинал',
      });
      const notes = getCollection(getUser('konan').client, Collections.Notes);
      await expect(notes.update(note.id, { text: 'Правка' })).rejects.toThrow();
      await expect(notes.update(note.id, { 'images+': createPngFile('x.png') })).rejects.toThrow();
      expect(
        (await getCollection(bob.client, Collections.Notes).update(note.id, { text: 'Правка' }))
          .text,
      ).toBe('Правка');
    });

    it('"стала песней" - только песня того же проекта', async () => {
      const bob = getUser('bob');
      const other = await createProject(bob.client, { name: 'Соседний', owner: bob.id });
      const foreign = await createSong(bob.client, other.id, 'Из соседнего', []);
      const ownSong = await createSong(bob.client, project.id, 'Своя из заметки', []);
      const note = await createNote(bob.client, { project: project.id }, bob.id, { text: 'идея' });
      const expectWrongProject = async (request: Promise<unknown>): Promise<void> => {
        expect(getErrorCode(await getRejection(request), 'became_song')).toBe('wrong_project');
      };
      const foreignLink = { became_song: foreign.id };
      // автор и редактор
      await expectWrongProject(
        getCollection(bob.client, Collections.Notes).update(note.id, foreignLink),
      );
      await expectWrongProject(
        getCollection(getUser('konan').client, Collections.Notes).update(note.id, foreignLink),
      );
      // и при создании
      await expectWrongProject(
        getCollection(bob.client, Collections.Notes).create({
          project: project.id,
          author: bob.id,
          text: 'x',
          became_song: foreign.id,
        }),
      );
      const linked = await getCollection(getUser('konan').client, Collections.Notes).update(
        note.id,
        {
          became_song: ownSong.id,
        },
      );
      expect(linked.became_song).toBe(ownSong.id);
    });

    it('заметка проекта становится песней у редактора', async () => {
      const bob = getUser('bob');
      const note = await createNote(bob.client, { project: project.id }, bob.id, {
        text: 'Баллада про поезд',
      });
      const song = await createSongFromNote(getUser('konan').client, note, 'Поезд', templates);
      const after = await getCollection(bob.client, Collections.Notes).getOne(note.id);
      expect(after.became_song).toBe(song.id);
      expect(song.project).toBe(project.id);
    });

    it('у аудио сохраняется исходное имя, даже по-русски', async () => {
      const bob = getUser('bob');
      const note = await createNote(bob.client, { project: project.id }, bob.id, {
        text: '',
        audio: [createWavFile(SMALL_AUDIO_SIZE, 'Линии страсти.wav')],
      });
      expect(note.audio_names).toEqual(['Линии страсти.wav']);
      expect(note.audio?.[0]).toMatch(/\.wav$/);
    });

    it('имена аудио в чужой заметке редактор не меняет', async () => {
      const bob = getUser('bob');
      const note = await createNote(bob.client, { project: project.id }, bob.id, {
        text: '',
        audio: [createWavFile(SMALL_AUDIO_SIZE, 'Дубль 1.wav')],
      });
      await expect(
        getCollection(getUser('konan').client, Collections.Notes).update(note.id, {
          audio_names: ['Чужое.wav'],
        }),
      ).rejects.toThrow();
      const renamed = await getCollection(bob.client, Collections.Notes).update(note.id, {
        audio_names: ['Дубль 2.wav'],
      });
      expect(renamed.audio_names).toEqual(['Дубль 2.wav']);
    });

    it('повторная отправка заметки с тем же id не создаёт вторую', async () => {
      const bob = getUser('bob');
      const noteId = getNewRecordId();
      const input = { id: noteId, text: 'из очереди' };
      await createNote(bob.client, { project: project.id }, bob.id, input);
      const again = await getRejection(
        createNote(bob.client, { project: project.id }, bob.id, input),
      );
      expect(getSendVerdict(again)).toBe(SendVerdict.Sent);
      const found = await getCollection(bob.client, Collections.Notes).getFullList({
        filter: bob.client.filter('text = {:text}', { text: 'из очереди' }),
      });
      expect(found.map((note) => note.id)).toEqual([noteId]);
    });

    it('аудио 40 МБ загружается; файл открывается только участникам проекта', async () => {
      const bob = getUser('bob');
      const note = await createNote(bob.client, { project: project.id }, bob.id, {
        text: 'Черновой микс',
        audio: [createWavFile(40 * BYTES_PER_MB, 'mix.wav')],
      });
      const file = note.audio?.[0] ?? '';
      expect(file).toMatch(/\.wav$/);
      expect((await fetch(bob.client.files.getURL(note, file))).ok).toBe(false);
      const withToken = bob.client.files.getURL(note, file, {
        token: await bob.client.files.getToken(),
      });
      expect((await fetch(withToken, { headers: { Range: 'bytes=0-15' } })).status).toBe(206);
      const carol = getUser('carol').client;
      const carolUrl = carol.files.getURL(note, file, { token: await carol.files.getToken() });
      expect((await fetch(carolUrl)).ok).toBe(false);
    });

    it('не аудио в поле аудио не принимается', async () => {
      const bob = getUser('bob');
      await expect(
        createNote(bob.client, { project: project.id }, bob.id, {
          text: 'x',
          audio: [new File(['not audio at all'], 'a.wav', { type: WAV_TYPE })],
        }),
      ).rejects.toThrow();
    });

    it('удаление проекта удаляет песни, этапы и заметки', async () => {
      const bob = getUser('bob');
      const tempProject = await createProject(bob.client, { name: 'Временный', owner: bob.id });
      const song = await createSong(bob.client, tempProject.id, 'x', []);
      await getCollection(bob.client, Collections.SongStages).create({
        song: song.id,
        title: 'Э',
        position: 0,
        status: StageStatus.not_started,
      });
      await createNote(bob.client, { project: tempProject.id, song: song.id }, bob.id, {
        text: 'x',
      });
      await getCollection(bob.client, Collections.Projects).delete(tempProject.id);
      const songFilter = getSongFilter(bob.client, song.id);
      expect(
        await getCollection(bob.client, Collections.SongStages).getFullList({ filter: songFilter }),
      ).toHaveLength(0);
      expect(
        await getCollection(bob.client, Collections.Notes).getFullList({ filter: songFilter }),
      ).toHaveLength(0);
    });
  });

  describe('песни и этапы', () => {
    it('песню и этап не перенести в другой проект или песню', async () => {
      const bob = getUser('bob');
      const other = await createProject(bob.client, { name: 'Чужой', owner: bob.id });
      const song = await createSong(bob.client, project.id, 'Своя', templates);
      await expect(
        getCollection(bob.client, Collections.Songs).update(song.id, { project: other.id }),
      ).rejects.toThrow();
      const second = await createSong(bob.client, project.id, 'Вторая', templates);
      const stage = await getCollection(bob.client, Collections.SongStages).getFirstListItem(
        getSongFilter(bob.client, song.id),
      );
      await expect(
        getCollection(bob.client, Collections.SongStages).update(stage.id, { song: second.id }),
      ).rejects.toThrow();
    });

    it('порядок этапов после перетаскивания сохраняется одной транзакцией', async () => {
      const bob = getUser('bob');
      const song = await createSong(bob.client, project.id, 'Порядок', templates);
      const stages = getCollection(bob.client, Collections.SongStages);
      await stages.create({
        song: song.id,
        title: 'Сведение',
        position: 2,
        status: StageStatus.not_started,
      });
      const filter = getSongFilter(bob.client, song.id);
      const before = await stages.getFullList({ filter, sort: 'position' });
      const [first, , third] = before;
      const areStagesMissing = !first || !third;
      if (areStagesMissing) {
        throw new Error('нет этапов');
      }
      const reordered = moveItemById(before, third.id, first.id);
      await savePositions(bob.client, Collections.SongStages, reordered);
      const after = await stages.getFullList({ filter, sort: 'position' });
      expect(after.map((stage) => stage.title)).toEqual(['Сведение', 'Демо', 'Запись']);
    });

    it('текст песни - одно поле песни', async () => {
      const bob = getUser('bob');
      const song = await createSong(bob.client, project.id, 'Слова', []);
      await getCollection(bob.client, Collections.Songs).update(song.id, {
        lyrics: '[Куплет]\nраз',
      });
      const updated = await getCollection(getUser('konan').client, Collections.Songs).update(
        song.id,
        { lyrics: '[Куплет]\nдва' },
      );
      expect(updated.lyrics).toBe('[Куплет]\nдва');
    });

    it('обложек несколько, основная - по имени файла', async () => {
      const bob = getUser('bob');
      const song = await createSong(bob.client, project.id, 'Обложки', []);
      const songs = getCollection(bob.client, Collections.Songs);
      const form = new FormData();
      form.append('covers', createPngFile('a.png'));
      form.append('covers', createPngFile('b.png'));
      const withCovers = await songs.update(song.id, form);
      expect(withCovers.covers).toHaveLength(2);
      const second = withCovers.covers?.[1] ?? '';
      const main = await songs.update(song.id, { main_cover: second });
      expect(main.main_cover).toBe(second);
      const fewer = await songs.update(song.id, { 'covers-': second });
      expect(fewer.covers).toHaveLength(1);
    });
  });

  describe('релиз', () => {
    it('на лейбл - только с датой релиза, текстом и обложкой для релиза', async () => {
      const bob = getUser('bob');
      const songs = getCollection(bob.client, Collections.Songs);
      const song = await createSong(bob.client, project.id, 'На лейбл', []);
      const sentEarly = await getRejection(songs.update(song.id, { status: SongStatus.sent }));
      expect(getResponseStatus(sentEarly)).toBe(400);
      await songs.update(song.id, { lyrics: '[Куплет]\nраз' });
      await expect(songs.update(song.id, { status: SongStatus.sent })).rejects.toThrow();
      const form = new FormData();
      form.set('release_cover', createCoverFile());
      await songs.update(song.id, form);
      await expect(songs.update(song.id, { status: SongStatus.sent })).rejects.toThrow();
      await songs.update(song.id, { target_release: getDayFromNow(30) });
      const sent = await songs.update(song.id, { status: SongStatus.sent });
      expect(sent.status).toBe(SongStatus.sent);
      // у отправленной песни дату, текст и обложку не убрать, а заменить обложку можно
      await expect(songs.update(song.id, { target_release: '' })).rejects.toThrow();
      await expect(songs.update(song.id, { lyrics: '' })).rejects.toThrow();
      await expect(songs.update(song.id, { release_cover: '' })).rejects.toThrow();
      const again = new FormData();
      again.set('release_cover', createCoverFile());
      expect((await songs.update(song.id, again)).release_cover).toBeTruthy();
      // финальную версию трека добавляют и заменяют и после отправки, но не убирают
      const master = new FormData();
      master.set('release_audio', new File([createWav(SMALL_AUDIO_SIZE)], 'master.wav'));
      expect((await songs.update(song.id, master)).release_audio).toMatch(/\.wav$/);
      const remaster = new FormData();
      remaster.set('release_audio', new File([createWav(2048)], 'remaster.wav'));
      expect((await songs.update(song.id, remaster)).release_audio).toMatch(/^remaster.*\.wav$/);
      await expect(
        songs.update(song.id, { release_audio: null, release_audio_name: '' }),
      ).rejects.toThrow();
      // отправку отменили - убрать можно
      await songs.update(song.id, { status: SongStatus.done });
      const cleared = await songs.update(song.id, { release_audio: null, release_audio_name: '' });
      expect(cleared.release_audio).toBeFalsy();
    });

    it('текст, обложка и отправка - одним запросом', async () => {
      const bob = getUser('bob');
      const song = await createSong(bob.client, project.id, 'Сразу', []);
      const form = new FormData();
      form.set('lyrics', 'текст');
      form.set('release_cover', createCoverFile());
      form.set('target_release', getDayFromNow(30));
      form.set('status', SongStatus.sent);
      const sent = await getCollection(bob.client, Collections.Songs).update(song.id, form);
      expect(sent.status).toBe(SongStatus.sent);
    });

    it('обложка для релиза - ровно 3000x3000: размер сервер читает из файла', async () => {
      const bob = getUser('bob');
      const songs = getCollection(bob.client, Collections.Songs);
      const song = await createSong(bob.client, project.id, 'Размер обложки', []);
      for (const [width, height] of [
        [1, 1],
        [2999, 3000],
        [3000, 2999],
        [3001, 3001],
      ]) {
        const form = new FormData();
        form.set('release_cover', createCoverFile(width, height));
        const error = await getRejection(songs.update(song.id, form));
        expect(getResponseStatus(error)).toBe(400);
        expect(getErrorCode(error, 'release_cover')).toBe('cover_size');
        expect(getResponseMessage(error)).toBe(
          `Обложка для релиза - JPEG ровно 3000x3000, у этого файла ${width}x${height}.`,
        );
      }
      // и при создании песни
      const createForm = new FormData();
      createForm.set('project', project.id);
      createForm.set('title', 'Сразу с обложкой');
      createForm.set('status', SongStatus.not_started);
      createForm.set('release_cover', createCoverFile(1500, 1500));
      const createError = await getRejection(songs.create(createForm));
      expect(getErrorCode(createError, 'release_cover')).toBe('cover_size');

      const validForm = new FormData();
      validForm.set('release_cover', createCoverFile());
      const saved = await songs.update(song.id, validForm);
      expect(saved.release_cover).toMatch(/\.jpg$/);
      // файл - настоящая картинка: PocketBase (Go image/jpeg) уменьшает её для превью
      const token = await bob.client.files.getToken();
      const coverName = saved.release_cover ?? '';
      const thumbUrl = bob.client.files.getURL(saved, coverName, { token, thumb: THUMB_SIZE });
      const thumb = await fetch(thumbUrl);
      expect(thumb.status).toBe(200);
      expect((await thumb.arrayBuffer()).byteLength).toBeLessThan(5000);
      // прежняя обложка не перечитывается при других правках
      expect((await songs.update(song.id, { lyrics: 'текст' })).release_cover).toBe(
        saved.release_cover,
      );
    });

    it('обложка для релиза - только JPEG', async () => {
      const bob = getUser('bob');
      const song = await createSong(bob.client, project.id, 'PNG', []);
      const form = new FormData();
      form.set('release_cover', createPngFile('cover.png'));
      await expect(
        getCollection(bob.client, Collections.Songs).update(song.id, form),
      ).rejects.toThrow();
    });

    it('финальная версия: WAV или MP3 с исходным именем, другое не принимается, чужим не открывается', async () => {
      const bob = getUser('bob');
      const songs = getCollection(bob.client, Collections.Songs);
      const song = await createSong(bob.client, project.id, 'Мастер', []);
      const form = new FormData();
      const masterName = 'Линии страсти (master).wav';
      form.set('release_audio', new File([createWav(50 * BYTES_PER_MB)], masterName));
      form.set('release_audio_name', masterName);
      const next = await songs.update(song.id, form);
      expect(next.release_audio).toMatch(/\.wav$/);
      expect(next.release_audio_name).toBe('Линии страсти (master).wav');
      const carol = getUser('carol').client;
      const carolUrl = carol.files.getURL(next, next.release_audio ?? '', {
        token: await carol.files.getToken(),
      });
      expect((await fetch(carolUrl)).ok).toBe(false);
      const badForm = new FormData();
      badForm.set('release_audio', new File(['not audio at all'], 'fake.wav', { type: WAV_TYPE }));
      await expect(songs.update(song.id, badForm)).rejects.toThrow();
      // MP3 тоже подходит: 0,1 с тишины (ffmpeg, libmp3lame 32 кбит/с)
      const mp3 = Uint8Array.from(atob(MP3_SILENCE), (char) => char.charCodeAt(0));
      const mp3Form = new FormData();
      mp3Form.set('release_audio', new File([mp3], 'master.mp3', { type: 'audio/mpeg' }));
      expect((await songs.update(song.id, mp3Form)).release_audio).toMatch(/\.mp3$/);
      // а FLAC - нет
      const flacForm = new FormData();
      flacForm.set('release_audio', new File([`fLaC${'\0'.repeat(64)}`], 'master.flac'));
      await expect(songs.update(song.id, flacForm)).rejects.toThrow();
      const cleared = await songs.update(song.id, { release_audio: null, release_audio_name: '' });
      expect(cleared.release_audio).toBeFalsy();
    });

    it('отправленная песня в день релиза становится выпущенной, перенос даты вперёд - обратно', async () => {
      const bob = getUser('bob');
      const songs = getCollection(bob.client, Collections.Songs);
      const song = await createSong(bob.client, project.id, 'Выпуск', []);
      const form = new FormData();
      form.set('release_cover', createCoverFile());
      form.set('lyrics', 'текст');
      form.set('target_release', getDayFromNow(7));
      await songs.update(song.id, form);
      const sent = await songs.update(song.id, { status: SongStatus.sent });
      expect(sent.status).toBe(SongStatus.sent);
      const releasedToday = await songs.update(song.id, { target_release: getDayFromNow(0) });
      expect(releasedToday.status).toBe(SongStatus.released);
      const postponed = await songs.update(song.id, { target_release: getDayFromNow(3) });
      expect(postponed.status).toBe(SongStatus.sent);
      const withLink = await songs.update(song.id, { bandlink: 'https://band.link/withme' });
      expect(withLink.bandlink).toBe('https://band.link/withme');
    });

    it('удаление этапа удаляет его заметки', async () => {
      const bob = getUser('bob');
      const song = await createSong(bob.client, project.id, 'Этап с заметкой', templates);
      const stage = await getCollection(bob.client, Collections.SongStages).getFirstListItem(
        getSongFilter(bob.client, song.id),
      );
      const note = await createNote(
        bob.client,
        { project: project.id, song: song.id, stage: stage.id },
        bob.id,
        {
          text: 'x',
          images: [createPngFile('a.png')],
        },
      );
      await getCollection(getUser('konan').client, Collections.SongStages).delete(stage.id);
      await expect(getCollection(bob.client, Collections.Notes).getOne(note.id)).rejects.toThrow();
    });
  });

  describe('резервная копия', () => {
    // имена копий на сервере глазами суперпользователя
    async function getServerBackupKeys(): Promise<string[]> {
      const superuserClient = createClient();
      await superuserClient
        .collection(Collections.Superusers)
        .authWithPassword(SUPERUSER.email, SUPERUSER.password);
      const backups = await superuserClient.backups.getFullList();
      return backups.map((backup) => backup.key);
    }

    it('только главный собирает, скачивает и восстанавливает копию', async () => {
      const bob = getUser('bob');
      await expect(bob.client.send(BACKUP_PATH, { method: POST_METHOD })).rejects.toThrow();

      const konan = getUser('konan').client;
      const marker = await createNote(bob.client, { project: project.id }, bob.id, {
        text: 'до копии',
      });
      const first: BackupResponse = await konan.send(BACKUP_PATH, { method: POST_METHOD });
      expect(first.name).toMatch(/^bounce-\d{8}-\d{6}-\d{3}\.zip$/);
      // вторая сборка подряд: новая копия, прежняя удалена
      const second: BackupResponse = await konan.send(BACKUP_PATH, { method: POST_METHOD });
      expect(second.name).not.toBe(first.name);
      expect(await getServerBackupKeys()).toEqual([second.name]);

      // ссылка на скачивание - с файловым токеном главного; токен участника не подходит
      const getDownloadLink = (token: string): string =>
        `${baseUrl}${BACKUP_PATH}/${second.name}?token=${encodeURIComponent(token)}`;
      const bobLink = getDownloadLink(await bob.client.files.getToken());
      expect((await fetch(bobLink)).status).toBe(403);
      const response = await fetch(getDownloadLink(await konan.files.getToken()));
      expect(response.status).toBe(200);
      expect(response.headers.get('content-disposition')).toContain(second.name);
      const zip = new Blob([await response.arrayBuffer()], { type: ZIP_TYPE });
      expect(zip.size).toBeGreaterThan(1000);

      await getCollection(bob.client, Collections.Notes).delete(marker.id);

      const form = new FormData();
      form.set('file', new File([zip], 'copy.zip', { type: ZIP_TYPE }));
      const uploaded: BackupResponse = await konan.send(`${BACKUP_PATH}/upload`, {
        method: POST_METHOD,
        body: form,
      });
      // на сервере остаётся только загруженная копия, собранная перед ней удалена
      expect(uploaded.name).not.toBe(second.name);
      expect(await getServerBackupKeys()).toEqual([uploaded.name]);
      // восстановление перезапускает сервер: ответ может не дойти
      await konan
        .send(`${BACKUP_PATH}/restore`, { method: POST_METHOD, body: { name: uploaded.name } })
        .catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, RESTART_DELAY_MS));
      await waitForHealth(baseUrl);
      const restored = await getCollection(bob.client, Collections.Notes).getOne(marker.id);
      expect(restored.text).toBe('до копии');
    });
  });

  describe('сброс 2FA главным', () => {
    it('bounce-admin --reset-2fa: главный без аутентификатора входит по паролю', async () => {
      // stdin - через настоящий канал (cat |), как в docker compose exec -T: у Node это сокет, а
      // его PocketBase как /dev/stdin не откроет
      const runBounceAdmin = (extraArgs: string[], input = ''): Buffer =>
        execFileSync(
          'sh',
          ['-c', 'cat | "$0" "$@"', PB_BINARY, 'bounce-admin', 'ivan', ...extraArgs, ...dirArgs],
          {
            input,
            stdio: 'pipe',
          },
        );
      // пароль - со stdin, а не аргументом
      runBounceAdmin(['--password-stdin', '--name', 'Иван'], `${PASSWORD}\n`);
      const before = createClient();
      await before.collection(Collections.Users).authWithPassword('ivan', PASSWORD);
      expect(before.authStore.record?.is_admin).toBe(true);
      expect(before.authStore.record?.name).toBe('Иван');
      await enrollTotp(before);
      const withoutCode = await getRejection(
        createClient().collection(Collections.Users).authWithPassword('ivan', PASSWORD),
      );
      expect(getErrorCode(withoutCode)).toBe('totp_required');

      // сброс без пароля: пароль и имя прежние, сессии закрыты, вход без кода
      runBounceAdmin(['--reset-2fa']);
      await expect(before.collection(Collections.Users).authRefresh()).rejects.toThrow();
      const after = createClient();
      await after.collection(Collections.Users).authWithPassword('ivan', PASSWORD);
      expect(after.authStore.record?.totp_enabled).toBe(false);
      expect(after.authStore.record?.name).toBe('Иван');
      expect((await getCollection(after, Collections.Projects).getList()).items).toHaveLength(0);
      // 2FA подключается заново
      await enrollTotp(after);
      expect(after.authStore.record?.totp_enabled).toBe(true);

      // сброс вместе с новым паролем
      runBounceAdmin(['--reset-2fa', '--password-stdin'], `${RESET_PASSWORD}\n`);
      await expect(
        createClient().collection(Collections.Users).authWithPassword('ivan', PASSWORD),
      ).rejects.toThrow();
      const third = createClient();
      await third.collection(Collections.Users).authWithPassword('ivan', RESET_PASSWORD);
      expect(third.authStore.record?.totp_enabled).toBe(false);

      // без пароля нового главного не создать
      expect(() =>
        execFileSync(PB_BINARY, ['bounce-admin', 'nobody', '--reset-2fa', ...dirArgs], {
          stdio: 'pipe',
        }),
      ).toThrow();
    });

    it('участник не может сбросить чужую 2FA', async () => {
      await expect(
        getUser('carol').client.send(getTotpResetPath(getUser('bob').id), { method: POST_METHOD }),
      ).rejects.toThrow();
    });

    it('после сброса сессии пользователя закрыты, вход без кода, данных нет до подключения', async () => {
      const carol = getUser('carol');
      await getUser('konan').client.send(getTotpResetPath(carol.id), { method: POST_METHOD });
      await expect(carol.client.collection(Collections.Users).authRefresh()).rejects.toThrow();
      const carolProjects = await getCollection(carol.client, Collections.Projects).getList();
      expect(carolProjects.items).toHaveLength(0);
      const fresh = createClient();
      await fresh.collection(Collections.Users).authWithPassword('carol', PASSWORD);
      expect(fresh.authStore.record?.totp_enabled).toBe(false);
      expect((await getCollection(fresh, Collections.Users).getList()).items).toHaveLength(0);
    });
  });
});

describe.skipIf(SHOULD_SKIP_SERVER_TESTS)(
  'PocketBase: откат миграций и ограничение частоты',
  () => {
    const tempDirs: string[] = [];
    afterAll(() => {
      for (const tempDir of tempDirs) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
    // временный каталог, который удалится после тестов
    function createTempDir(): string {
      const tempDir = mkdtempSync(join(tmpdir(), 'bounce-pb-'));
      tempDirs.push(tempDir);
      return tempDir;
    }

    it('migrate down до первой миграции, исполнители - обратно, migrate up - снова', () => {
      const dataDir = createTempDir();
      const hooksDir = join(dataDir, 'hooks');
      mkdirSync(hooksDir);
      writeFileSync(join(hooksDir, 'seed.pb.js'), SEED);
      const runPb = (command: string[], input = ''): string =>
        execFileSync(PB_BINARY, [...command, ...getDirArgs(dataDir, hooksDir)], {
          input,
          stdio: 'pipe',
          encoding: 'utf8',
        });
      const migrationFiles = readdirSync(MIGRATIONS_DIR)
        .filter((fileName) => fileName.endsWith('.js'))
        .sort();
      // откат спрашивает подтверждение y/N
      const migrateDown = (count: number): string =>
        runPb(['migrate', 'down', String(count)], 'y\n');

      runPb(['migrate', 'up']);
      const idsPath = join(dataDir, 'ids.json');
      const dumpPath = join(dataDir, 'dump.json');
      runPb(['test-seed', idsPath]);
      // сначала - до миграции, которая сделала исполнителей списком (включительно)
      const fromAssignees = migrationFiles.filter(
        (fileName) => fileName >= ASSIGNEES_MIGRATION,
      ).length;
      expect(migrateDown(fromAssignees)).toContain('Reverted 1762600000_assignees.js');
      runPb(['test-dump', idsPath, dumpPath]);
      const seeded = JSON.parse(readFileSync(idsPath, 'utf8'));
      expect(JSON.parse(readFileSync(dumpPath, 'utf8'))).toEqual({
        stage: seeded.ann,
        task: seeded.ben,
      });
      // и дальше - до первой
      const rest = migrateDown(migrationFiles.length - fromAssignees);
      expect(rest).toContain('Reverted 1762400000_roles.js');
      expect(rest).toContain('Reverted 1762000000_bounce.js');
      const again = runPb(['migrate', 'up']);
      const firstMigration = migrationFiles[0];
      const lastMigration = migrationFiles[migrationFiles.length - 1];
      expect(again).toContain(`Applied ${firstMigration}`);
      expect(again).toContain(`Applied ${lastMigration}`);
    });

    it('/api/bounce/totp/: 10 запросов в минуту с адреса, 11-й - 429', async () => {
      const dataDir = createTempDir();
      const port = await getFreePort();
      const baseUrl = getBaseUrl(port);
      const serverProcess = spawnServer(port, getDirArgs(dataDir));
      try {
        await waitForHealth(baseUrl);
        const postTotp = async (action: string): Promise<number> => {
          const response = await fetch(`${baseUrl}/api/bounce/totp/${action}`, {
            method: POST_METHOD,
          });
          return response.status;
        };
        // без входа - 401, но запросы считаются; setup и enable - общий счёт
        const firstStatuses: number[] = [];
        for (let round = 0; round < RATE_LIMIT_ROUNDS; round++) {
          firstStatuses.push(await postTotp('setup'), await postTotp('enable'));
        }
        expect(firstStatuses).toEqual(new Array(10).fill(401));
        expect(await postTotp('setup')).toBe(429);
        expect(await postTotp('enable')).toBe(429);
        // остальное API это правило не задевает
        expect((await fetch(`${baseUrl}/api/health`)).status).toBe(200);
      } finally {
        serverProcess.kill();
      }
    });
  },
);
