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
import { sendVerdict } from '@/lib/errors';
import { newRecordId } from '@/lib/id';
import type { Project, Song, StageTemplate } from '@/lib/model';
import { createNote, EMPTY_NOTES_FILTER, notesFilter } from '@/lib/notes';
import { collection } from '@/lib/pb';
import { createPost } from '@/lib/posts';
import { createProject } from '@/lib/projects';
import { createSong, songFromNote, stagesFromTemplate } from '@/lib/songs';
import { arrayMoveById, savePositions } from '@/lib/stages';
import { createTask } from '@/lib/tasks';

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
const MP3_SILENCE =
  '//NAxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEWwAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsSjAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

describe.skipIf(!existsSync(BIN))('PocketBase: доступ, проекты, заметки, 2FA', () => {
  let dir = '';
  let url = '';
  let proc: ChildProcess | undefined;
  // konan - главный, bob и carol - участники с 2FA, dave - без 2FA, erin - с 2FA, но проекты
  // создавать не может
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

    for (const name of ['bob', 'carol', 'dave', 'erin']) {
      const created = await collection(konan, 'users').create({
        username: name,
        name: name.toUpperCase(),
        password: PASSWORD,
        passwordConfirm: PASSWORD,
        can_create_projects: name !== 'erin',
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
      roles: { editor: [users['konan']?.id ?? ''] },
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

  describe('суперпользователь', () => {
    it('через прокси (X-Forwarded-For) не входит и не продлевает вход, напрямую - входит', async () => {
      const viaProxy = new PocketBase(url);
      viaProxy.beforeSend = (to, options) => {
        options.headers = { ...options.headers, 'X-Forwarded-For': '203.0.113.5' };
        return { url: to, options };
      };
      const sup = (c: PocketBase, name: string) =>
        c.collection(name).authWithPassword(ADMIN.email, ADMIN.password);
      await expect(sup(viaProxy, '_superusers')).rejects.toThrow();
      await expect(sup(viaProxy, 'pbc_3142635823')).rejects.toThrow();

      const direct = new PocketBase(url);
      await sup(direct, '_superusers');
      viaProxy.authStore.save(direct.authStore.token, direct.authStore.record);
      await expect(viaProxy.collection('_superusers').authRefresh()).rejects.toThrow();

      // обычные пользователи через прокси входят как прежде
      const user = new PocketBase(url);
      user.beforeSend = viaProxy.beforeSend;
      await user.collection('users').authWithPassword('dave', PASSWORD);
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

    it('свой аватар: файл закрыт, с токеном открывается и уменьшается', async () => {
      const bob = u('bob');
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64',
      );
      const form = new FormData();
      form.set('avatar', new Blob([png], { type: 'image/png' }), 'me.png');
      const me = await collection(bob.client, 'users').update(bob.id, form);
      expect(me.avatar).toBeTruthy();
      const open = await fetch(bob.client.files.getURL(me, me.avatar));
      expect(open.status).not.toBe(200);
      const token = await u('konan').client.files.getToken();
      const thumb = await fetch(bob.client.files.getURL(me, me.avatar, { token, thumb: '96x96' }));
      expect(thumb.status).toBe(200);
      const other = new FormData();
      other.set('avatar', new Blob([png], { type: 'image/png' }), 'x.png');
      await expect(collection(u('carol').client, 'users').update(bob.id, other)).rejects.toThrow();
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

    it('главный задаёт пароль другому без старого; себе и не главный - только со старым', async () => {
      const konan = u('konan');
      const NEW = 'new-password-2';
      const frank = await collection(konan.client, 'users').create({
        username: 'frank',
        name: 'Frank',
        password: PASSWORD,
        passwordConfirm: PASSWORD,
      });
      const session = new PocketBase(url);
      await session.collection('users').authWithPassword('frank', PASSWORD);

      // не главный: чужой пароль не задать, свой - только со старым
      await expect(
        collection(u('bob').client, 'users').update(frank.id, {
          password: NEW,
          passwordConfirm: NEW,
        }),
      ).rejects.toThrow();
      const bob = u('bob');
      await expect(
        collection(bob.client, 'users').update(bob.id, { password: NEW, passwordConfirm: NEW }),
      ).rejects.toThrow();
      await collection(konan.client, 'users').update(frank.id, {
        password: NEW,
        passwordConfirm: NEW,
      });

      // прежние сессии закрыты, вход - только с новым паролем
      await expect(session.collection('users').authRefresh()).rejects.toThrow();
      await expect(
        new PocketBase(url).collection('users').authWithPassword('frank', PASSWORD),
      ).rejects.toThrow();
      await new PocketBase(url).collection('users').authWithPassword('frank', NEW);

      // себе - только со старым паролем; поля 2FA и скрытые поля главному по-прежнему закрыты
      await expect(
        collection(konan.client, 'users').update(konan.id, {
          password: NEW,
          passwordConfirm: NEW,
        }),
      ).rejects.toThrow();
      await expect(
        collection(konan.client, 'users').update(frank.id, { totp_enabled: true }),
      ).rejects.toThrow();
      const seen = await collection(konan.client, 'users').getOne(frank.id);
      expect(seen).not.toHaveProperty('totp_secret');
      expect(seen.totp_enabled).toBe(false);
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
        collection(u('konan').client, 'projects').update(project.id, { 'editors+': carol.id }),
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

    it('песне без этапов редактор добавляет этапы шаблона; не участник проекта - нет', async () => {
      const song = await createSong(u('konan').client, project.id, 'Без этапов', []);
      await stagesFromTemplate(u('konan').client, song.id, templates);
      const stages = await collection(u('bob').client, 'song_stages').getFullList({
        filter: u('bob').client.filter('song = {:s}', { s: song.id }),
        sort: 'position',
      });
      expect(stages.map((s) => [s.title, s.position, s.status])).toEqual([
        ['Демо', 0, 'not_started'],
        ['Запись', 1, 'not_started'],
      ]);
      expect(stages[1]?.substeps).toMatchObject([{ title: 'Бас' }, { title: 'Вокал' }]);
      await expect(stagesFromTemplate(u('carol').client, song.id, templates)).rejects.toThrow();
    });

    it('новая песня встаёт в начало ручного порядка', async () => {
      const first = await createSong(u('bob').client, project.id, 'Первая', []);
      const second = await createSong(u('bob').client, project.id, 'Вторая', []);
      expect(second.position).toBeLessThan(first.position ?? 0);
      await savePositions(u('bob').client, 'songs', [
        { id: first.id, position: first.position ?? 0 },
        { id: second.id, position: second.position ?? 0 },
      ]);
      const list = await collection(u('bob').client, 'songs').getFullList({
        filter: u('bob').client.filter('id = {:a} || id = {:b}', { a: first.id, b: second.id }),
        sort: 'position',
      });
      expect(list.map((x) => x.title)).toEqual(['Первая', 'Вторая']);
      await expect(
        collection(u('carol').client, 'songs').update(first.id, { position: 5 }),
      ).rejects.toThrow();
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

  describe('роли', () => {
    let shared: Project;
    let song: Song;
    let stageId = '';

    beforeAll(async () => {
      const bob = u('bob');
      shared = await createProject(bob.client, {
        name: 'Роли',
        owner: bob.id,
        roles: { editor: [u('konan').id], contributor: [u('carol').id], viewer: [u('erin').id] },
      });
      song = await createSong(bob.client, shared.id, 'Общая', templates.slice(0, 1));
      const stage = await collection(bob.client, 'song_stages').getFirstListItem(
        bob.client.filter('song = {:s}', { s: song.id }),
      );
      stageId = stage.id;
    });

    it('промо-план: у нового проекта готовый набор, правят редакторы, участник и наблюдатель - нет', async () => {
      const list = (c: PocketBase) =>
        collection(c, 'promo_templates').getFullList({
          filter: c.filter('project = {:p}', { p: shared.id }),
          sort: 'offset',
        });
      const steps = await list(u('erin').client);
      expect(steps.map((x) => x.offset)).toEqual([-14, -7, -1, 0, 3, 7]);
      const release = steps.find((x) => x.offset === 0);
      expect(release?.title).toBe('Релиз');
      expect(release?.comment).toBe('Ссылка на bandlink');
      const first = steps[0];
      if (!first) throw new Error('нет шага');
      const konan = collection(u('konan').client, 'promo_templates');
      expect((await konan.update(first.id, { title: 'Анонс', offset: -10 })).offset).toBe(-10);
      await expect(
        collection(u('carol').client, 'promo_templates').update(first.id, { title: 'x' }),
      ).rejects.toThrow();
      await expect(
        collection(u('erin').client, 'promo_templates').create({
          project: shared.id,
          title: 'x',
          offset: 0,
        }),
      ).rejects.toThrow();
      await expect(konan.update(first.id, { offset: 400 })).rejects.toThrow();
      expect(await list(u('dave').client)).toEqual([]);
    });

    it('создавать проекты - главный и те, кому он разрешил; себе не разрешить', async () => {
      const erin = u('erin');
      await expect(
        createProject(erin.client, { name: 'Нельзя', owner: erin.id }),
      ).rejects.toThrow();
      await expect(
        collection(erin.client, 'users').update(erin.id, { can_create_projects: true }),
      ).rejects.toThrow();
      await collection(u('konan').client, 'users').update(erin.id, { can_create_projects: true });
      const own = await createProject(erin.client, { name: 'Можно', owner: erin.id });
      expect(own.owner).toBe(erin.id);
      await collection(erin.client, 'projects').delete(own.id);
      await collection(u('konan').client, 'users').update(erin.id, { can_create_projects: false });
    });

    it('у человека в проекте одна роль', async () => {
      await expect(
        collection(u('bob').client, 'projects').update(shared.id, {
          viewers: [u('erin').id, u('carol').id],
        }),
      ).rejects.toThrow();
      await expect(
        collection(u('bob').client, 'projects').update(shared.id, { 'editors+': u('bob').id }),
      ).rejects.toThrow();
    });

    it('наблюдатель только смотрит', async () => {
      const erin = u('erin').client;
      expect((await collection(erin, 'songs').getOne(song.id)).title).toBe('Общая');
      await expect(
        collection(erin, 'song_stages').update(stageId, { status: 'in_progress' }),
      ).rejects.toThrow();
      await expect(
        createNote(erin, { project: shared.id }, u('erin').id, { text: 'нельзя' }),
      ).rejects.toThrow();
      await expect(createSong(erin, shared.id, 'Нельзя', [])).rejects.toThrow();
    });

    it('участник: статус, срок и подэтапы этапа, заметки; песни и состав этапов - нет', async () => {
      const carol = u('carol').client;
      const stages = collection(carol, 'song_stages');
      expect((await stages.update(stageId, { status: 'in_progress' })).status).toBe('in_progress');
      await stages.update(stageId, {
        substeps: [{ id: 'x00000000000001', title: 'Дубль', done: true }],
      });
      await expect(stages.update(stageId, { title: 'Переименован' })).rejects.toThrow();
      await expect(stages.update(stageId, { position: 5 })).rejects.toThrow();
      await expect(stages.delete(stageId)).rejects.toThrow();
      await expect(
        stages.create({ song: song.id, title: 'Новый', position: 9, status: 'not_started' }),
      ).rejects.toThrow();
      await expect(
        collection(carol, 'songs').update(song.id, { title: 'Другое' }),
      ).rejects.toThrow();
      await expect(createSong(carol, shared.id, 'Нельзя', [])).rejects.toThrow();
      const note = await createNote(carol, { project: shared.id, song: song.id }, u('carol').id, {
        text: 'дубль 3 лучший',
      });
      expect(note.author).toBe(u('carol').id);
      await expect(
        collection(carol, 'stage_templates').create({
          project: shared.id,
          title: 'x',
          position: 0,
        }),
      ).rejects.toThrow();
    });

    it('редактор: песни и чужие заметки; участники и название проекта - только владелец', async () => {
      const konan = u('konan').client;
      const mine = await createSong(konan, shared.id, 'От редактора', []);
      await collection(konan, 'songs').update(mine.id, { title: 'Переименована' });
      await collection(konan, 'song_stages').update(stageId, { title: 'Демо 2', position: 0 });
      const other = await createNote(u('carol').client, { project: shared.id }, u('carol').id, {
        text: 'удалит редактор',
      });
      await expect(collection(u('erin').client, 'notes').delete(other.id)).rejects.toThrow();
      await collection(konan, 'notes').delete(other.id);
      await expect(
        collection(konan, 'projects').update(shared.id, { name: 'Чужое' }),
      ).rejects.toThrow();
      await expect(
        collection(konan, 'projects').update(shared.id, { viewers: [] }),
      ).rejects.toThrow();
    });

    it('наблюдатель, ставший из участника, свою заметку не правит', async () => {
      const carol = u('carol');
      const note = await createNote(carol.client, { project: shared.id }, carol.id, {
        text: 'раз',
      });
      await collection(u('bob').client, 'projects').update(shared.id, {
        contributors: [],
        viewers: [u('erin').id, carol.id],
      });
      await expect(
        collection(carol.client, 'notes').update(note.id, { text: 'два' }),
      ).rejects.toThrow();
      expect((await collection(carol.client, 'notes').getOne(note.id)).text).toBe('раз');
      await collection(u('bob').client, 'projects').update(shared.id, {
        contributors: [carol.id],
        viewers: [u('erin').id],
      });
    });
  });

  describe('планировщик', () => {
    let plan: Project;
    beforeAll(async () => {
      const bob = u('bob');
      plan = await createProject(bob.client, {
        name: 'План',
        owner: bob.id,
        roles: { contributor: [u('carol').id], viewer: [u('erin').id] },
      });
    });

    it('задачи ведут участники; наблюдатель только видит', async () => {
      const carol = u('carol');
      const t = await createTask(carol.client, {
        project: plan.id,
        title: 'Купить струны',
        author: carol.id,
        assignees: [carol.id, u('bob').id],
      });
      expect(t.done).toBe(false);
      const erin = u('erin').client;
      expect((await collection(erin, 'tasks').getOne(t.id)).title).toBe('Купить струны');
      await expect(collection(erin, 'tasks').update(t.id, { done: true })).rejects.toThrow();
      await expect(
        createTask(erin, { project: plan.id, title: 'нельзя', author: u('erin').id }),
      ).rejects.toThrow();
      await expect(collection(u('dave').client, 'tasks').getOne(t.id)).rejects.toThrow();
      await expect(
        createTask(carol.client, { project: plan.id, title: 'за другого', author: u('bob').id }),
      ).rejects.toThrow();
    });

    it('время выполнения ставит сервер, снятие отметки его стирает', async () => {
      const bob = u('bob');
      const t = await createTask(bob.client, {
        project: plan.id,
        title: 'Сдать мастер',
        author: bob.id,
      });
      const done = await collection(bob.client, 'tasks').update(t.id, { done: true });
      expect(done.done_at).toBeTruthy();
      const undone = await collection(bob.client, 'tasks').update(t.id, { done: false });
      expect(undone.done_at).toBe('');
    });

    it('песня задачи - только из того же проекта; удалили песню - задача осталась', async () => {
      const bob = u('bob');
      const foreign = await createSong(bob.client, project.id, 'Чужая для плана', []);
      await expect(
        createTask(bob.client, { project: plan.id, title: 'x', author: bob.id, song: foreign.id }),
      ).rejects.toThrow();
      const own = await createSong(bob.client, plan.id, 'Своя', []);
      const t = await createTask(bob.client, {
        project: plan.id,
        title: 'Обложка',
        author: bob.id,
        song: own.id,
      });
      const other = await createSong(bob.client, plan.id, 'Другая', []);
      expect((await collection(bob.client, 'tasks').update(t.id, { song: other.id })).song).toBe(
        other.id,
      );
      await expect(
        collection(bob.client, 'tasks').update(t.id, { song: foreign.id }),
      ).rejects.toThrow();
      await collection(bob.client, 'tasks').update(t.id, { song: own.id });
      await collection(bob.client, 'songs').delete(own.id);
      const after = await collection(bob.client, 'tasks').getOne(t.id);
      expect(after.song).toBe('');
    });

    it('исполнителей этапа (нескольких) ставит и участник', async () => {
      const bob = u('bob');
      const song = await createSong(bob.client, plan.id, 'С этапом', templates.slice(0, 1));
      const stage = await collection(bob.client, 'song_stages').getFirstListItem(
        bob.client.filter('song = {:s}', { s: song.id }),
      );
      const updated = await collection(u('carol').client, 'song_stages').update(stage.id, {
        assignees: [u('carol').id, u('bob').id],
      });
      expect(updated.assignees).toEqual([u('carol').id, u('bob').id]);
    });
  });

  describe('песня и контент-план', () => {
    it('тональность - только из списка, темп - целое 20..400', async () => {
      const songs = collection(u('bob').client, 'songs');
      const song = await createSong(u('bob').client, project.id, 'Тон', []);
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
      const bob = u('bob');
      const song = await createSong(bob.client, project.id, 'Свежая', templates.slice(0, 1));
      expect(song.status).toBe('not_started');
      const stage = await collection(bob.client, 'song_stages').getFirstListItem(
        bob.client.filter('song = {:s}', { s: song.id }),
      );
      await collection(bob.client, 'song_stages').update(stage.id, { status: 'in_progress' });
      expect((await collection(bob.client, 'songs').getOne(song.id)).status).toBe('active');
      // вручную можно вернуть "не начата"
      expect(
        (await collection(bob.client, 'songs').update(song.id, { status: 'not_started' })).status,
      ).toBe('not_started');
    });

    it('ссылки проекта правит владелец', async () => {
      const links = [{ service: 'spotify', url: 'https://open.spotify.com/artist/x' }];
      const updated = await collection(u('bob').client, 'projects').update(project.id, { links });
      expect(updated.links).toEqual(links);
      await expect(
        collection(u('konan').client, 'projects').update(project.id, { links: [] }),
      ).rejects.toThrow();
    });

    it('публикации: от релиза своей песни, ведут участники проекта', async () => {
      const bob = u('bob');
      const song = await createSong(bob.client, project.id, 'Промо', []);
      const post = await createPost(bob.client, {
        project: project.id,
        title: 'Тизер',
        author: bob.id,
        song: song.id,
        anchor: 'release',
        offset: -7,
        platforms: ['instagram', 'tiktok'],
      });
      expect(post.offset).toBe(-7);
      expect(post.platforms).toEqual(['instagram', 'tiktok']);
      const published = await collection(u('konan').client, 'posts').update(post.id, {
        status: 'published',
      });
      expect(published.status).toBe('published');
      await expect(collection(u('carol').client, 'posts').getOne(post.id)).rejects.toThrow();
      const other = await createProject(bob.client, { name: 'Другой', owner: bob.id });
      const foreign = await createSong(bob.client, other.id, 'Чужая', []);
      await expect(
        collection(bob.client, 'posts').update(post.id, { song: foreign.id }),
      ).rejects.toThrow();
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

    it('чужую заметку не переписать (удалить может редактор - см. роли)', async () => {
      const bob = u('bob');
      const note = await createNote(bob.client, { project: project.id }, bob.id, {
        text: 'Оригинал',
      });
      const notes = collection(u('konan').client, 'notes');
      await expect(notes.update(note.id, { text: 'Правка' })).rejects.toThrow();
      await expect(notes.update(note.id, { 'images+': png('x.png') })).rejects.toThrow();
      expect((await collection(bob.client, 'notes').update(note.id, { text: 'Правка' })).text).toBe(
        'Правка',
      );
    });

    it('заметка проекта становится песней у редактора', async () => {
      const bob = u('bob');
      const note = await createNote(bob.client, { project: project.id }, bob.id, {
        text: 'Баллада про поезд',
      });
      const song = await songFromNote(u('konan').client, note, 'Поезд', templates);
      const after = await collection(bob.client, 'notes').getOne(note.id);
      expect(after.became_song).toBe(song.id);
      expect(song.project).toBe(project.id);
    });

    it('у аудио сохраняется исходное имя, даже по-русски', async () => {
      const bob = u('bob');
      const note = await createNote(bob.client, { project: project.id }, bob.id, {
        text: '',
        audio: [new File([wav(1024)], 'Линии страсти.wav', { type: 'audio/wav' })],
      });
      expect(note.audio_names).toEqual(['Линии страсти.wav']);
      expect(note.audio?.[0]).toMatch(/\.wav$/);
    });

    it('имена аудио в чужой заметке редактор не меняет', async () => {
      const bob = u('bob');
      const note = await createNote(bob.client, { project: project.id }, bob.id, {
        text: '',
        audio: [new File([wav(1024)], 'Дубль 1.wav', { type: 'audio/wav' })],
      });
      await expect(
        collection(u('konan').client, 'notes').update(note.id, { audio_names: ['Чужое.wav'] }),
      ).rejects.toThrow();
      const own = await collection(bob.client, 'notes').update(note.id, {
        audio_names: ['Дубль 2.wav'],
      });
      expect(own.audio_names).toEqual(['Дубль 2.wav']);
    });

    it('повторная отправка заметки с тем же id не создаёт вторую', async () => {
      const bob = u('bob');
      const id = newRecordId();
      const input = { id, text: 'из очереди' };
      await createNote(bob.client, { project: project.id }, bob.id, input);
      const again = await rejectsWith(
        createNote(bob.client, { project: project.id }, bob.id, input),
      );
      expect(sendVerdict(again)).toBe('sent');
      const found = await collection(bob.client, 'notes').getFullList({
        filter: bob.client.filter('text = {:t}', { t: 'из очереди' }),
      });
      expect(found.map((n) => n.id)).toEqual([id]);
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

  describe('релиз', () => {
    // JPEG 1x1: сервер узнаёт тип по первым байтам
    const jpeg = () =>
      new File(
        [
          Uint8Array.from(
            atob(
              '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
            ),
            (c) => c.charCodeAt(0),
          ),
        ],
        'cover.jpg',
        { type: 'image/jpeg' },
      );
    const day = (offset: number) => {
      const d = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
      const p = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 12:00:00.000Z`;
    };

    it('на лейбл - только с датой релиза, текстом и обложкой для релиза', async () => {
      const bob = u('bob');
      const songs = collection(bob.client, 'songs');
      const song = await createSong(bob.client, project.id, 'На лейбл', []);
      const e = await rejectsWith(songs.update(song.id, { status: 'sent' }));
      expect(e instanceof ClientResponseError && e.status).toBe(400);
      await songs.update(song.id, { lyrics: '[Куплет]\nраз' });
      await expect(songs.update(song.id, { status: 'sent' })).rejects.toThrow();
      const form = new FormData();
      form.set('release_cover', jpeg());
      await songs.update(song.id, form);
      await expect(songs.update(song.id, { status: 'sent' })).rejects.toThrow();
      await songs.update(song.id, { target_release: day(30) });
      expect((await songs.update(song.id, { status: 'sent' })).status).toBe('sent');
      // у отправленной песни дату, текст и обложку не убрать, а заменить обложку можно
      await expect(songs.update(song.id, { target_release: '' })).rejects.toThrow();
      await expect(songs.update(song.id, { lyrics: '' })).rejects.toThrow();
      await expect(songs.update(song.id, { release_cover: '' })).rejects.toThrow();
      const again = new FormData();
      again.set('release_cover', jpeg());
      expect((await songs.update(song.id, again)).release_cover).toBeTruthy();
      // финальную версию трека добавляют и заменяют и после отправки, но не убирают
      const master = new FormData();
      master.set('release_audio', new File([wav(1024)], 'master.wav'));
      expect((await songs.update(song.id, master)).release_audio).toMatch(/\.wav$/);
      const remaster = new FormData();
      remaster.set('release_audio', new File([wav(2048)], 'remaster.wav'));
      expect((await songs.update(song.id, remaster)).release_audio).toMatch(/^remaster.*\.wav$/);
      await expect(
        songs.update(song.id, { release_audio: null, release_audio_name: '' }),
      ).rejects.toThrow();
      // отправку отменили - убрать можно
      await songs.update(song.id, { status: 'done' });
      const cleared = await songs.update(song.id, { release_audio: null, release_audio_name: '' });
      expect(cleared.release_audio).toBeFalsy();
    });

    it('текст, обложка и отправка - одним запросом', async () => {
      const bob = u('bob');
      const song = await createSong(bob.client, project.id, 'Сразу', []);
      const form = new FormData();
      form.set('lyrics', 'текст');
      form.set('release_cover', jpeg());
      form.set('target_release', day(30));
      form.set('status', 'sent');
      expect((await collection(bob.client, 'songs').update(song.id, form)).status).toBe('sent');
    });

    it('обложка для релиза - только JPEG', async () => {
      const bob = u('bob');
      const song = await createSong(bob.client, project.id, 'PNG', []);
      const form = new FormData();
      form.set('release_cover', png('cover.png'));
      await expect(collection(bob.client, 'songs').update(song.id, form)).rejects.toThrow();
    });

    it('финальная версия: WAV или MP3 с исходным именем, другое не принимается, чужим не открывается', async () => {
      const bob = u('bob');
      const songs = collection(bob.client, 'songs');
      const song = await createSong(bob.client, project.id, 'Мастер', []);
      const form = new FormData();
      form.set('release_audio', new File([wav(50 * 1024 * 1024)], 'Линии страсти (master).wav'));
      form.set('release_audio_name', 'Линии страсти (master).wav');
      const next = await songs.update(song.id, form);
      expect(next.release_audio).toMatch(/\.wav$/);
      expect(next.release_audio_name).toBe('Линии страсти (master).wav');
      const carol = u('carol').client;
      const url = carol.files.getURL(next, next.release_audio ?? '', {
        token: await carol.files.getToken(),
      });
      expect((await fetch(url)).ok).toBe(false);
      const bad = new FormData();
      bad.set('release_audio', new File(['not audio at all'], 'fake.wav', { type: 'audio/wav' }));
      await expect(songs.update(song.id, bad)).rejects.toThrow();
      // MP3 тоже подходит: 0,1 с тишины (ffmpeg, libmp3lame 32 кбит/с)
      const mp3 = Uint8Array.from(atob(MP3_SILENCE), (c) => c.charCodeAt(0));
      const asMp3 = new FormData();
      asMp3.set('release_audio', new File([mp3], 'master.mp3', { type: 'audio/mpeg' }));
      expect((await songs.update(song.id, asMp3)).release_audio).toMatch(/\.mp3$/);
      // а FLAC - нет
      const flac = new FormData();
      flac.set('release_audio', new File(['fLaC' + '\0'.repeat(64)], 'master.flac'));
      await expect(songs.update(song.id, flac)).rejects.toThrow();
      const cleared = await songs.update(song.id, { release_audio: null, release_audio_name: '' });
      expect(cleared.release_audio).toBeFalsy();
    });

    it('отправленная песня в день релиза становится выпущенной, перенос даты вперёд - обратно', async () => {
      const bob = u('bob');
      const songs = collection(bob.client, 'songs');
      const song = await createSong(bob.client, project.id, 'Выпуск', []);
      const form = new FormData();
      form.set('release_cover', jpeg());
      form.set('lyrics', 'текст');
      form.set('target_release', day(7));
      await songs.update(song.id, form);
      expect((await songs.update(song.id, { status: 'sent' })).status).toBe('sent');
      expect((await songs.update(song.id, { target_release: day(0) })).status).toBe('released');
      expect((await songs.update(song.id, { target_release: day(3) })).status).toBe('sent');
      expect((await songs.update(song.id, { bandlink: 'https://band.link/withme' })).bandlink).toBe(
        'https://band.link/withme',
      );
    });

    it('удаление этапа удаляет его заметки', async () => {
      const bob = u('bob');
      const song = await createSong(bob.client, project.id, 'Этап с заметкой', templates);
      const stage = await collection(bob.client, 'song_stages').getFirstListItem(
        bob.client.filter('song = {:s}', { s: song.id }),
      );
      const note = await createNote(
        bob.client,
        { project: project.id, song: song.id, stage: stage.id },
        bob.id,
        {
          text: 'x',
          images: [png('a.png')],
        },
      );
      await collection(u('konan').client, 'song_stages').delete(stage.id);
      await expect(collection(bob.client, 'notes').getOne(note.id)).rejects.toThrow();
    });
  });

  describe('резервная копия', () => {
    // копии на сервере глазами суперпользователя
    async function serverBackups() {
      const su = new PocketBase(url);
      await su.collection('_superusers').authWithPassword(ADMIN.email, ADMIN.password);
      return su.backups.getFullList();
    }

    it('только главный собирает, скачивает и восстанавливает копию', async () => {
      const bob = u('bob');
      await expect(bob.client.send('/api/bounce/backup', { method: 'POST' })).rejects.toThrow();

      const konan = u('konan').client;
      const marker = await createNote(bob.client, { project: project.id }, bob.id, {
        text: 'до копии',
      });
      const { name }: { name: string } = await konan.send('/api/bounce/backup', { method: 'POST' });
      expect(name).toMatch(/^bounce-\d{8}-\d{6}-\d{3}\.zip$/);
      // вторая сборка подряд: новая копия, прежняя удалена
      const second: { name: string } = await konan.send('/api/bounce/backup', { method: 'POST' });
      expect(second.name).not.toBe(name);
      expect((await serverBackups()).map((b) => b.key)).toEqual([second.name]);

      // ссылка на скачивание - с файловым токеном главного; токен участника не подходит
      const link = (token: string) =>
        `${url}/api/bounce/backup/${second.name}?token=${encodeURIComponent(token)}`;
      expect((await fetch(link(await bob.client.files.getToken()))).status).toBe(403);
      const res = await fetch(link(await konan.files.getToken()));
      expect(res.status).toBe(200);
      expect(res.headers.get('content-disposition')).toContain(second.name);
      const zip = new Blob([await res.arrayBuffer()], { type: 'application/zip' });
      expect(zip.size).toBeGreaterThan(1000);

      await collection(bob.client, 'notes').delete(marker.id);

      const form = new FormData();
      form.set('file', new File([zip], 'copy.zip', { type: 'application/zip' }));
      const up: { name: string } = await konan.send('/api/bounce/backup/upload', {
        method: 'POST',
        body: form,
      });
      // на сервере остаётся только загруженная копия, собранная перед ней удалена
      expect(up.name).not.toBe(second.name);
      expect((await serverBackups()).map((b) => b.key)).toEqual([up.name]);
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
