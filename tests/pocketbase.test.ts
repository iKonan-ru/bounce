// Схема, правила доступа и 2FA на настоящем PocketBase: временный каталог данных, миграции и
// хуки проекта, свободный порт. Бинарник - pocketbase/bin/pocketbase (tools/pocketbase.sh
// скачивает его); без него тесты пропускаются.
import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import PocketBase, { ClientResponseError } from 'pocketbase';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Project, StageTemplate } from '@/lib/model';
import { createNote, EMPTY_NOTES_FILTER, notesFilter } from '@/lib/notes';
import { collection } from '@/lib/pb';
import { createProject } from '@/lib/projects';
import { createSong, songFromNote } from '@/lib/songs';
import { arrayMoveById, savePositions } from '@/lib/stages';

const BIN = join(process.cwd(), 'pocketbase/bin/pocketbase');
const MIGRATIONS = join(process.cwd(), 'pocketbase/pb_migrations');
const HOOKS = join(process.cwd(), 'pocketbase/pb_hooks');
const ADMIN = { email: 'admin@example.com', password: 'admin-password-1' };
const PASSWORD = 'user-password-1';

type Totp = { code(secret: string, unixSeconds: number): string };
const totp: Totp = createRequire(import.meta.url)('../pocketbase/pb_hooks/lib/totp.js');
const now = () => Math.floor(Date.now() / 1000);

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      srv.close(() => (addr && typeof addr === 'object' ? resolve(addr.port) : reject()));
    });
  });
}

async function waitHealth(url: string): Promise<void> {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${url}/api/health`)).ok) return;
    } catch {
      // ещё не слушает
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('PocketBase не поднялся');
}

function errorCode(e: unknown): string {
  if (!(e instanceof ClientResponseError)) return '';
  const f: unknown = e.response['data']?.['code'];
  return typeof f === 'object' && f !== null && 'code' in f && typeof f.code === 'string'
    ? f.code
    : '';
}

async function rejectsWith(p: Promise<unknown>): Promise<unknown> {
  try {
    await p;
  } catch (e) {
    return e;
  }
  throw new Error('ожидалась ошибка');
}

// подключить 2FA текущему пользователю клиента; возвращает ключ
async function enroll(client: PocketBase): Promise<string> {
  const res: { secret: string } = await client.send('/api/bounce/totp/setup', { method: 'POST' });
  await client.send('/api/bounce/totp/enable', {
    method: 'POST',
    body: { code: totp.code(res.secret, now()) },
  });
  await client.collection('users').authRefresh();
  return res.secret;
}

// WAV-заголовок и тишина: PocketBase распознаёт файл как audio/wav
function wav(bytes: number): Blob {
  const header = new Uint8Array(44);
  const view = new DataView(header.buffer);
  const ascii = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) header[off + i] = s.charCodeAt(i);
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + bytes, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, 44100, true);
  view.setUint32(28, 44100 * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, bytes, true);
  return new Blob([header, new Uint8Array(bytes)], { type: 'audio/wav' });
}

// картинка 1x1 PNG
const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1,
  0, 0, 0, 1, 8, 6, 0, 0, 0, 0x1f, 0x15, 0xc4, 0x89, 0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
  0x60, 0x82,
]);
const png = (name: string) => new File([PNG], name, { type: 'image/png' });

describe.skipIf(!existsSync(BIN))('PocketBase: доступ, проекты, заметки, 2FA', () => {
  let dir = '';
  let url = '';
  let proc: ChildProcess | undefined;
  // konan - главный, bob и carol - участники с 2FA, dave - без 2FA
  const users: Record<string, { client: PocketBase; id: string; secret: string }> = {};
  let project: Project;
  let templates: StageTemplate[] = [];

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'bounce-pb-'));
    const args = [
      '--dir',
      join(dir, 'pb_data'),
      '--migrationsDir',
      MIGRATIONS,
      '--hooksDir',
      HOOKS,
    ];
    execFileSync(BIN, ['superuser', 'upsert', ADMIN.email, ADMIN.password, ...args]);
    execFileSync(BIN, ['bounce-admin', 'konan', PASSWORD, 'Konan', ...args]);
    const port = await freePort();
    url = `http://127.0.0.1:${port}`;
    proc = spawn(BIN, ['serve', '--http', `127.0.0.1:${port}`, ...args], { stdio: 'ignore' });
    await waitHealth(url);

    // тесты шлют запросы быстрее человека: ограничение частоты им мешает
    const su = new PocketBase(url);
    await su.collection('_superusers').authWithPassword(ADMIN.email, ADMIN.password);
    await su.settings.update({ rateLimits: { enabled: false } });

    const konan = new PocketBase(url);
    const me = await konan.collection('users').authWithPassword('konan', PASSWORD);
    users['konan'] = { client: konan, id: me.record.id, secret: await enroll(konan) };

    for (const name of ['bob', 'carol', 'dave']) {
      const created = await collection(konan, 'users').create({
        username: name,
        name: name.toUpperCase(),
        password: PASSWORD,
        passwordConfirm: PASSWORD,
      });
      const client = new PocketBase(url);
      await client.collection('users').authWithPassword(name, PASSWORD);
      const secret = name === 'dave' ? '' : await enroll(client);
      users[name] = { client, id: created.id, secret };
    }

    const bob = users['bob'];
    if (!bob) throw new Error('нет bob');
    project = await createProject(bob.client, {
      name: 'Дуэт',
      owner: bob.id,
      members: [users['konan']?.id ?? ''],
    });
    // шаблон проекта сначала пустой; для тестов песен - два этапа
    const tpl = collection(bob.client, 'stage_templates');
    await tpl.create({ project: project.id, title: 'Демо', position: 0, substeps: [] });
    await tpl.create({
      project: project.id,
      title: 'Запись',
      position: 1,
      substeps: [
        { id: 'sub000000000001', title: 'Бас' },
        { id: 'sub000000000002', title: 'Вокал' },
      ],
    });
    templates = await tpl.getFullList<StageTemplate>({
      filter: bob.client.filter('project = {:p}', { p: project.id }),
      sort: 'position',
    });
  });

  afterAll(() => {
    proc?.kill();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  function u(name: string) {
    const x = users[name];
    if (!x) throw new Error(`нет ${name}`);
    return x;
  }

  describe('вход и 2FA', () => {
    it('с 2FA без кода токена нет, с неверным тоже; верный код - один раз', async () => {
      const c = new PocketBase(url);
      const users = c.collection('users');
      // SDK заменяет тело запроса целиком, поэтому логин и пароль - в нём же
      const withCode = (code: string) =>
        users.authWithPassword('konan', PASSWORD, {
          body: { identity: 'konan', password: PASSWORD, code },
        });
      expect(errorCode(await rejectsWith(users.authWithPassword('konan', PASSWORD)))).toBe(
        'totp_required',
      );
      expect(errorCode(await rejectsWith(withCode('1')))).toBe('totp_invalid');
      // следующий шаг времени: код подключения уже израсходован
      const code = totp.code(u('konan').secret, now() + 30);
      await withCode(code);
      expect(c.authStore.isValid).toBe(true);
      expect(errorCode(await rejectsWith(withCode(code)))).toBe('totp_invalid');
    });

    it('о 2FA не говорится, пока пароль неверный', async () => {
      const c = new PocketBase(url);
      const e = await rejectsWith(c.collection('users').authWithPassword('konan', 'wrong'));
      expect(errorCode(e)).toBe('');
    });

    it('без подключённой 2FA данных нет', async () => {
      const dave = u('dave').client;
      expect((await collection(dave, 'projects').getList()).items).toHaveLength(0);
      expect((await collection(dave, 'users').getList()).items).toHaveLength(0);
      await expect(createProject(dave, { name: 'Свой', owner: u('dave').id })).rejects.toThrow();
    });

    it('2FA нельзя выключить себе через API', async () => {
      const bob = u('bob');
      await expect(
        collection(bob.client, 'users').update(bob.id, { totp_enabled: false }),
      ).rejects.toThrow();
    });
  });

  describe('пользователи', () => {
    it('регистрации нет, заводит только главный', async () => {
      const anon = new PocketBase(url);
      const body = { username: 'eve', name: 'Eve', password: PASSWORD, passwordConfirm: PASSWORD };
      await expect(collection(anon, 'users').create(body)).rejects.toThrow();
      await expect(collection(u('bob').client, 'users').create(body)).rejects.toThrow();
    });

    it('себе - имя, но не права главного и не логин', async () => {
      const bob = u('bob');
      const users = collection(bob.client, 'users');
      expect((await users.update(bob.id, { name: 'Боб' })).name).toBe('Боб');
      await expect(users.update(bob.id, { is_admin: true })).rejects.toThrow();
      await expect(users.update(bob.id, { username: 'robert' })).rejects.toThrow();
    });

    it('логин уникален', async () => {
      await expect(
        collection(u('konan').client, 'users').create({
          username: 'bob',
          name: 'Второй',
          password: PASSWORD,
          passwordConfirm: PASSWORD,
        }),
      ).rejects.toThrow();
    });
  });

  describe('проекты', () => {
    it('проект видят владелец и участники, остальные - нет', async () => {
      const ids = async (name: string) =>
        (await collection(u(name).client, 'projects').getFullList()).map((p) => p.id);
      expect(await ids('bob')).toContain(project.id);
      expect(await ids('konan')).toContain(project.id);
      expect(await ids('carol')).not.toContain(project.id);
    });

    it('новый проект пустой: шаблона этапов нет', async () => {
      const bob = u('bob');
      const fresh = await createProject(bob.client, { name: 'Пустой', owner: bob.id });
      const t = await collection(bob.client, 'stage_templates').getFullList({
        filter: bob.client.filter('project = {:p}', { p: fresh.id }),
      });
      expect(t).toHaveLength(0);
      const song = await createSong(bob.client, fresh.id, 'Без этапов', []);
      const stages = await collection(bob.client, 'song_stages').getFullList({
        filter: bob.client.filter('song = {:s}', { s: song.id }),
      });
      expect(stages).toHaveLength(0);
    });

    it('аватар проекта меняет только владелец', async () => {
      const form = new FormData();
      form.set('avatar', png('logo.png'));
      const updated = await collection(u('bob').client, 'projects').update(project.id, form);
      expect(updated.avatar).toMatch(/\.png$/);
      const again = new FormData();
      again.set('avatar', png('other.png'));
      await expect(
        collection(u('konan').client, 'projects').update(project.id, again),
      ).rejects.toThrow();
    });

    it('участниками управляет только владелец', async () => {
      const carol = u('carol');
      await expect(
        collection(u('konan').client, 'projects').update(project.id, { 'members+': carol.id }),
      ).rejects.toThrow();
      await expect(
        collection(u('bob').client, 'projects').update(project.id, { owner: carol.id }),
      ).rejects.toThrow();
    });

    it('чужой проект не создать', async () => {
      await expect(
        createProject(u('carol').client, { name: 'Подлог', owner: u('bob').id }),
      ).rejects.toThrow();
    });

    it('песня создаётся с этапами и подэтапами шаблона и видна только проекту', async () => {
      const song = await createSong(u('konan').client, project.id, 'With me', templates);
      const stages = await collection(u('bob').client, 'song_stages').getFullList({
        filter: u('bob').client.filter('song = {:s}', { s: song.id }),
        sort: 'position',
      });
      expect(stages.map((s) => s.title)).toEqual(['Демо', 'Запись']);
      expect(stages[1]?.substeps).toMatchObject([
        { title: 'Бас', done: false },
        { title: 'Вокал', done: false },
      ]);
      expect(stages.every((s) => s.status === 'not_started')).toBe(true);
      await expect(collection(u('carol').client, 'songs').getOne(song.id)).rejects.toThrow();
      await expect(createSong(u('carol').client, project.id, 'Чужая', templates)).rejects.toThrow();
    });

    it('статуса "на проверке" больше нет', async () => {
      const bob = u('bob');
      const song = await createSong(bob.client, project.id, 'Статусы', templates);
      const stage = await collection(bob.client, 'song_stages').getFirstListItem(
        bob.client.filter('song = {:s}', { s: song.id }),
      );
      await expect(
        collection(bob.client, 'song_stages').update(stage.id, { status: 'review' }),
      ).rejects.toThrow();
      expect(
        (await collection(bob.client, 'song_stages').update(stage.id, { status: 'done' })).status,
      ).toBe('done');
    });
  });

  describe('заметки', () => {
    it('заметка у проекта, песни и этапа; раздел "Все заметки" находит все три', async () => {
      const bob = u('bob');
      const song = await createSong(bob.client, project.id, 'Линии страсти', templates);
      const stage = await collection(bob.client, 'song_stages').getFirstListItem(
        bob.client.filter('song = {:s} && position = 1', { s: song.id }),
      );
      const a = await createNote(bob.client, { project: project.id }, bob.id, {
        text: 'Кавер в 6/8',
      });
      const b = await createNote(bob.client, { project: project.id, song: song.id }, bob.id, {
        text: 'Припев длинноват',
      });
      const c = await createNote(
        bob.client,
        { project: project.id, song: song.id, stage: stage.id },
        bob.id,
        {
          text: 'Бас через Ampeg #тёплый',
          images: [png('amp.png')],
        },
      );
      expect([a.song, b.song, c.stage]).toEqual(['', song.id, stage.id]);
      expect(c.expand?.stage?.title).toBe('Запись');

      const find = async (patch: Partial<typeof EMPTY_NOTES_FILTER>) =>
        (
          await collection(bob.client, 'notes').getFullList({
            filter: notesFilter(bob.client, project.id, { ...EMPTY_NOTES_FILTER, ...patch }),
          })
        ).map((n) => n.id);
      expect(await find({ song: song.id })).toEqual(expect.arrayContaining([b.id, c.id]));
      expect(await find({ level: 'project' })).toContain(a.id);
      expect(await find({ level: 'project' })).not.toContain(b.id);
      expect(await find({ level: 'stage', text: 'ampeg' })).toEqual([c.id]);
      expect(await find({ withImages: true, song: song.id })).toEqual([c.id]);
      expect(await find({ text: 'тёплый' })).toEqual([c.id]);
    });

    it('автор - только сам пишущий; песня - из того же проекта', async () => {
      const bob = u('bob');
      await expect(
        createNote(bob.client, { project: project.id }, u('konan').id, { text: 'x' }),
      ).rejects.toThrow();
      const other = await createProject(bob.client, { name: 'Другой', owner: bob.id });
      const foreign = await createSong(bob.client, other.id, 'Не отсюда', []);
      await expect(
        createNote(bob.client, { project: project.id, song: foreign.id }, bob.id, { text: 'x' }),
      ).rejects.toThrow();
    });

    it('чужую заметку не переписать и не удалить', async () => {
      const bob = u('bob');
      const note = await createNote(bob.client, { project: project.id }, bob.id, {
        text: 'Оригинал',
      });
      const notes = collection(u('konan').client, 'notes');
      await expect(notes.update(note.id, { text: 'Правка' })).rejects.toThrow();
      await expect(notes.update(note.id, { 'images+': png('x.png') })).rejects.toThrow();
      await expect(notes.delete(note.id)).rejects.toThrow();
      expect((await collection(bob.client, 'notes').update(note.id, { text: 'Правка' })).text).toBe(
        'Правка',
      );
    });

    it('заметка проекта становится песней - у любого участника', async () => {
      const bob = u('bob');
      const note = await createNote(bob.client, { project: project.id }, bob.id, {
        text: 'Баллада про поезд',
      });
      const song = await songFromNote(u('konan').client, note, 'Поезд', templates);
      const after = await collection(bob.client, 'notes').getOne(note.id);
      expect(after.became_song).toBe(song.id);
      expect(song.project).toBe(project.id);
    });

    it('аудио 40 МБ загружается; файл открывается только участникам проекта', async () => {
      const bob = u('bob');
      const note = await createNote(bob.client, { project: project.id }, bob.id, {
        text: 'Черновой микс',
        audio: [new File([wav(40 * 1024 * 1024)], 'mix.wav', { type: 'audio/wav' })],
      });
      const file = note.audio?.[0] ?? '';
      expect(file).toMatch(/\.wav$/);
      expect((await fetch(bob.client.files.getURL(note, file))).ok).toBe(false);
      const withToken = bob.client.files.getURL(note, file, {
        token: await bob.client.files.getToken(),
      });
      expect((await fetch(withToken, { headers: { Range: 'bytes=0-15' } })).status).toBe(206);
      const carol = u('carol').client;
      const carolUrl = carol.files.getURL(note, file, { token: await carol.files.getToken() });
      expect((await fetch(carolUrl)).ok).toBe(false);
    });

    it('не аудио в поле аудио не принимается', async () => {
      const bob = u('bob');
      await expect(
        createNote(bob.client, { project: project.id }, bob.id, {
          text: 'x',
          audio: [new File(['not audio at all'], 'a.wav', { type: 'audio/wav' })],
        }),
      ).rejects.toThrow();
    });

    it('удаление проекта удаляет песни, этапы и заметки', async () => {
      const bob = u('bob');
      const temp = await createProject(bob.client, { name: 'Временный', owner: bob.id });
      const song = await createSong(bob.client, temp.id, 'x', []);
      await collection(bob.client, 'song_stages').create({
        song: song.id,
        title: 'Э',
        position: 0,
        status: 'not_started',
      });
      await createNote(bob.client, { project: temp.id, song: song.id }, bob.id, { text: 'x' });
      await collection(bob.client, 'projects').delete(temp.id);
      const f = bob.client.filter('song = {:s}', { s: song.id });
      expect(await collection(bob.client, 'song_stages').getFullList({ filter: f })).toHaveLength(
        0,
      );
      expect(await collection(bob.client, 'notes').getFullList({ filter: f })).toHaveLength(0);
    });
  });

  describe('песни и этапы', () => {
    it('песню и этап не перенести в другой проект или песню', async () => {
      const bob = u('bob');
      const other = await createProject(bob.client, { name: 'Чужой', owner: bob.id });
      const song = await createSong(bob.client, project.id, 'Своя', templates);
      await expect(
        collection(bob.client, 'songs').update(song.id, { project: other.id }),
      ).rejects.toThrow();
      const second = await createSong(bob.client, project.id, 'Вторая', templates);
      const stage = await collection(bob.client, 'song_stages').getFirstListItem(
        bob.client.filter('song = {:s}', { s: song.id }),
      );
      await expect(
        collection(bob.client, 'song_stages').update(stage.id, { song: second.id }),
      ).rejects.toThrow();
    });

    it('порядок этапов после перетаскивания сохраняется одной транзакцией', async () => {
      const bob = u('bob');
      const song = await createSong(bob.client, project.id, 'Порядок', templates);
      const stages = collection(bob.client, 'song_stages');
      await stages.create({ song: song.id, title: 'Сведение', position: 2, status: 'not_started' });
      const filter = bob.client.filter('song = {:s}', { s: song.id });
      const before = await stages.getFullList({ filter, sort: 'position' });
      const [first, , third] = before;
      if (!first || !third) throw new Error('нет этапов');
      await savePositions(bob.client, 'song_stages', arrayMoveById(before, third.id, first.id));
      const after = await stages.getFullList({ filter, sort: 'position' });
      expect(after.map((s) => s.title)).toEqual(['Сведение', 'Демо', 'Запись']);
    });

    it('текст песни - одно поле песни', async () => {
      const bob = u('bob');
      const song = await createSong(bob.client, project.id, 'Слова', []);
      await collection(bob.client, 'songs').update(song.id, { lyrics: '[Куплет]\nраз' });
      const v = await collection(u('konan').client, 'songs').update(song.id, {
        lyrics: '[Куплет]\nдва',
      });
      expect(v.lyrics).toBe('[Куплет]\nдва');
    });

    it('обложек несколько, основная - по имени файла', async () => {
      const bob = u('bob');
      const song = await createSong(bob.client, project.id, 'Обложки', []);
      const form = new FormData();
      form.append('covers', png('a.png'));
      form.append('covers', png('b.png'));
      const withCovers = await collection(bob.client, 'songs').update(song.id, form);
      expect(withCovers.covers).toHaveLength(2);
      const second = withCovers.covers?.[1] ?? '';
      const main = await collection(bob.client, 'songs').update(song.id, { main_cover: second });
      expect(main.main_cover).toBe(second);
      const fewer = await collection(bob.client, 'songs').update(song.id, { 'covers-': second });
      expect(fewer.covers).toHaveLength(1);
    });
  });

  describe('резервная копия', () => {
    it('только главный собирает, скачивает и восстанавливает копию', async () => {
      const bob = u('bob');
      await expect(bob.client.send('/api/bounce/backup', { method: 'POST' })).rejects.toThrow();

      const konan = u('konan').client;
      const marker = await createNote(bob.client, { project: project.id }, bob.id, {
        text: 'до копии',
      });
      const { name }: { name: string } = await konan.send('/api/bounce/backup', { method: 'POST' });
      expect(name).toMatch(/^bounce-\d{8}-\d{6}\.zip$/);

      // ссылка на скачивание - с файловым токеном главного; токен участника не подходит
      const link = (token: string) =>
        `${url}/api/bounce/backup/${name}?token=${encodeURIComponent(token)}`;
      expect((await fetch(link(await bob.client.files.getToken()))).status).toBe(403);
      const res = await fetch(link(await konan.files.getToken()));
      expect(res.status).toBe(200);
      expect(res.headers.get('content-disposition')).toContain(name);
      const zip = new Blob([await res.arrayBuffer()], { type: 'application/zip' });
      expect(zip.size).toBeGreaterThan(1000);

      await collection(bob.client, 'notes').delete(marker.id);

      const form = new FormData();
      form.set('file', new File([zip], 'copy.zip', { type: 'application/zip' }));
      const up: { name: string } = await konan.send('/api/bounce/backup/upload', {
        method: 'POST',
        body: form,
      });
      // восстановление перезапускает сервер: ответ может не дойти
      await konan
        .send('/api/bounce/backup/restore', { method: 'POST', body: { name: up.name } })
        .catch(() => undefined);
      await new Promise((r) => setTimeout(r, 1000));
      await waitHealth(url);
      const back = await collection(bob.client, 'notes').getOne(marker.id);
      expect(back.text).toBe('до копии');
    });
  });

  describe('сброс 2FA главным', () => {
    it('участник не может сбросить чужую 2FA', async () => {
      await expect(
        u('carol').client.send(`/api/bounce/users/${u('bob').id}/totp-reset`, { method: 'POST' }),
      ).rejects.toThrow();
    });

    it('после сброса сессии пользователя закрыты, вход без кода, данных нет до подключения', async () => {
      const carol = u('carol');
      await u('konan').client.send(`/api/bounce/users/${carol.id}/totp-reset`, { method: 'POST' });
      await expect(carol.client.collection('users').authRefresh()).rejects.toThrow();
      expect((await collection(carol.client, 'projects').getList()).items).toHaveLength(0);
      const fresh = new PocketBase(url);
      await fresh.collection('users').authWithPassword('carol', PASSWORD);
      expect(fresh.authStore.record?.['totp_enabled']).toBe(false);
      expect((await collection(fresh, 'users').getList()).items).toHaveLength(0);
    });
  });
});
