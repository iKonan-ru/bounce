// Схема и правила доступа на настоящем PocketBase: временный каталог данных, миграции проекта,
// свободный порт. Бинарник - pocketbase/bin/pocketbase (tools/pocketbase.sh скачивает его);
// без него тесты пропускаются.
import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import PocketBase from 'pocketbase';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { StageTemplate } from '@/lib/model';
import { collection } from '@/lib/pb';
import { createSong } from '@/lib/songs';

const BIN = join(process.cwd(), 'pocketbase/bin/pocketbase');
const MIGRATIONS = join(process.cwd(), 'pocketbase/pb_migrations');
const ADMIN = { email: 'admin@example.com', password: 'admin-password-1' };
const PASSWORD = 'user-password-1';

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

describe.skipIf(!existsSync(BIN))('PocketBase: схема и правила', () => {
  let dir = '';
  let url = '';
  let proc: ChildProcess | undefined;
  let alice: PocketBase;
  let bob: PocketBase;
  let aliceId = '';
  let bobId = '';
  let templates: StageTemplate[] = [];

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'bounce-pb-'));
    const args = ['--dir', join(dir, 'pb_data'), '--migrationsDir', MIGRATIONS];
    execFileSync(BIN, ['superuser', 'upsert', ADMIN.email, ADMIN.password, ...args]);
    const port = await freePort();
    url = `http://127.0.0.1:${port}`;
    proc = spawn(BIN, ['serve', '--http', `127.0.0.1:${port}`, ...args], { stdio: 'ignore' });
    await waitHealth(url);

    const admin = new PocketBase(url);
    await admin.collection('_superusers').authWithPassword(ADMIN.email, ADMIN.password);
    // тесты шлют запросы быстрее человека: ограничение частоты им мешает
    await admin.settings.update({ rateLimits: { enabled: false } });
    const users = collection(admin, 'users');
    for (const name of ['alice', 'bob']) {
      await users.create({
        email: `${name}@example.com`,
        password: PASSWORD,
        passwordConfirm: PASSWORD,
        name,
      });
    }
    alice = new PocketBase(url);
    bob = new PocketBase(url);
    aliceId = (await alice.collection('users').authWithPassword('alice@example.com', PASSWORD))
      .record.id;
    bobId = (await bob.collection('users').authWithPassword('bob@example.com', PASSWORD)).record.id;
    templates = await collection(alice, 'stage_templates').getFullList<StageTemplate>({
      sort: 'position',
    });
  });

  afterAll(() => {
    proc?.kill();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('регистрация закрыта', async () => {
    const anon = new PocketBase(url);
    await expect(
      anon.collection('users').create({
        email: 'eve@example.com',
        password: PASSWORD,
        passwordConfirm: PASSWORD,
      }),
    ).rejects.toThrow();
  });

  it('без входа данных не видно', async () => {
    await createSong(alice, { title: 'Скрытая' }, templates);
    const anon = new PocketBase(url);
    expect((await anon.collection('songs').getList()).items).toHaveLength(0);
  });

  it('шаблон этапов из ТЗ: 10 этапов, эффекты необязательны, у записи живых 9 подэтапов', () => {
    expect(templates.map((t) => t.title)).toHaveLength(10);
    expect(templates.find((t) => t.title === 'Эффекты')?.optional).toBe(true);
    expect(templates[5]?.substeps).toHaveLength(9);
  });

  it('песня создаётся сразу с этапами из шаблона', async () => {
    const song = await createSong(alice, { title: 'With me', bpm: 120 }, templates);
    const stages = await collection(bob, 'song_stages').getFullList({
      filter: bob.filter('song = {:id}', { id: song.id }),
      sort: 'position',
    });
    expect(song.status).toBe('active');
    expect(stages.map((s) => s.title)).toEqual(templates.map((t) => t.title));
    expect(stages.every((s) => s.status === 'not_started')).toBe(true);
  });

  it('автор комментария - только сам пишущий; правит и удаляет его только автор', async () => {
    const song = await createSong(alice, { title: 'Линии страсти' }, templates);
    const comments = collection(alice, 'comments');
    await expect(
      comments.create({ song: song.id, text: 'чужой', author: bobId }),
    ).rejects.toThrow();
    const c = await comments.create({ song: song.id, text: 'свой', author: aliceId });
    await expect(collection(bob, 'comments').update(c.id, { text: 'правка' })).rejects.toThrow();
    await expect(collection(alice, 'comments').update(c.id, { author: bobId })).rejects.toThrow();
    expect((await comments.update(c.id, { text: 'правка' })).text).toBe('правка');
  });

  it('версии текста только добавляются', async () => {
    const song = await createSong(alice, { title: 'Uli Priest' }, templates);
    const lyrics = collection(alice, 'lyrics');
    const v = await lyrics.create({ song: song.id, text: '[Куплет]', author: aliceId });
    await expect(lyrics.update(v.id, { text: 'другое' })).rejects.toThrow();
    await expect(lyrics.delete(v.id)).rejects.toThrow();
  });

  it('удаление песни удаляет её этапы и комментарии', async () => {
    const song = await createSong(alice, { title: 'Удаляемая' }, templates);
    await collection(alice, 'comments').create({ song: song.id, text: 'x', author: aliceId });
    await collection(alice, 'songs').delete(song.id);
    const filter = alice.filter('song = {:id}', { id: song.id });
    expect(await collection(alice, 'song_stages').getFullList({ filter })).toHaveLength(0);
    expect(await collection(alice, 'comments').getFullList({ filter })).toHaveLength(0);
  });
});
