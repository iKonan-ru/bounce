import type { QueryClient } from '@tanstack/react-query';
import { clear, createStore, del, entries, get, set } from 'idb-keyval';
import { useSyncExternalStore } from 'react';
import { type SendVerdict, sendVerdict } from './errors';
import { newRecordId } from './id';
import { createNote, type NoteScope } from './notes';
import { pb } from './pb';

// Черновики заметок без сети: заметка с файлами ложится в IndexedDB и уходит на сервер, когда
// связь вернётся - по событию online, возвращению к приложению, входу, удачной отправке из формы
// и по таймеру, пока сервер недоступен.
//
// Черновик принадлежит автору: другой человек на этом устройстве его не видит и не отправляет.
// Явный выход (кнопка "Выйти") стирает черновики; потерянная сессия (её закрыли, токен истёк) -
// нет: после входа того же человека они уйдут. Вход другого человека стирает чужие.

export type PendingNote = {
  // он же id записи на сервере: повтор после потерянного ответа не создаёт вторую заметку
  id: string;
  scope: NoteScope;
  author: string;
  text: string;
  images: File[];
  audio: File[];
  created: string;
  // сервер отказал (не сеть): заметка ждёт, пока её не удалят
  rejected?: boolean;
};

const store = createStore('bounce-outbox', 'notes');
let items: PendingNote[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function load(): Promise<void> {
  const all = await entries<string, PendingNote>(store);
  items = all.map(([, v]) => v).sort((a, b) => a.created.localeCompare(b.created));
  emit();
}

const currentUser = () => (pb.authStore.isValid ? (pb.authStore.record?.id ?? '') : '');

let flushing = false;
// отправку попросили, пока шла предыдущая (новый черновик, вход): после неё - ещё один проход
let again = false;

// id - тот, с которым заметку уже пробовали отправить (если пробовали)
export async function queueNote(
  note: Omit<PendingNote, 'id' | 'created'> & { id?: string },
): Promise<void> {
  const item: PendingNote = {
    ...note,
    id: note.id ?? newRecordId(),
    created: new Date().toISOString(),
  };
  await set(item.id, item, store);
  if (flushing) again = true;
  await load();
}

export async function dropPending(id: string): Promise<void> {
  await del(id, store);
  await load();
}

// Повтор, пока сервер недоступен, а браузер считает, что сеть есть (события online не будет):
// через 30 секунд, потом реже, до 10 минут.
const RETRY_FIRST = 30_000;
const RETRY_MAX = 10 * 60_000;
let retryDelay = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleRetry(client: QueryClient) {
  clearTimeout(retryTimer);
  retryDelay = retryDelay ? Math.min(retryDelay * 2, RETRY_MAX) : RETRY_FIRST;
  retryTimer = setTimeout(() => void flushOutbox(client), retryDelay);
}

function resetRetry() {
  clearTimeout(retryTimer);
  retryTimer = undefined;
  retryDelay = 0;
}

// Создание заметки с закрытой сессией PocketBase отклоняет так же, как без доступа к проекту
// (400 без подробностей). Отказ считается окончательным, только если сессия жива.
async function sessionAlive(): Promise<boolean> {
  try {
    await pb.collection('users').authRefresh();
    return true;
  } catch {
    return false;
  }
}

// Одна очередь на все окна приложения: черновик с аудио не грузится дважды из двух вкладок.
// Пока очередь отправляет одно окно, другое пропускает свой проход.
async function exclusively(run: () => Promise<void>): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    await navigator.locks.request('bounce-outbox', { ifAvailable: true }, async (lock) => {
      if (lock) await run();
    });
    return;
  }
  await run();
}

export async function flushOutbox(client: QueryClient): Promise<void> {
  if (!navigator.onLine || !currentUser()) return;
  if (flushing) {
    again = true;
    return;
  }
  flushing = true;
  again = false;
  let sent = 0;
  let retry = false;
  try {
    await exclusively(async () => {
      await load();
      for (const item of items) {
        // чужие черновики и отклонённые не отправляются; сменился пользователь - тоже стоп
        if (item.rejected || item.author !== currentUser()) continue;
        let verdict: SendVerdict = 'sent';
        try {
          await createNote(pb, item.scope, item.author, {
            id: item.id,
            text: item.text,
            images: item.images,
            audio: item.audio,
          });
        } catch (e) {
          verdict = sendVerdict(e);
          if (verdict === 'reject' && !(await sessionAlive())) verdict = 'retry';
        }
        // сеть, сервер или сессия недоступны - остальные черновики тоже подождут
        if (verdict === 'retry') {
          retry = true;
          break;
        }
        // пока шла отправка, черновик удалили (кнопкой или выходом) - не возвращаем его
        if (!(await get(item.id, store))) continue;
        if (verdict === 'reject') {
          await set(item.id, { ...item, rejected: true }, store);
          continue;
        }
        await del(item.id, store);
        sent++;
      }
    });
  } finally {
    try {
      await load();
      if (sent > 0) await client.invalidateQueries({ queryKey: ['notes'] });
    } finally {
      flushing = false;
    }
    if (retry) scheduleRetry(client);
    else resetRetry();
    if (again) void flushOutbox(client);
  }
}

// После refreshAuth (ready): с закрытой сессией первый проход только пометил бы черновики
// отклонёнными.
export function startOutbox(client: QueryClient, ready: Promise<unknown>): void {
  void Promise.all([load(), ready.catch(() => undefined)]).then(() => flushOutbox(client));
  window.addEventListener('online', () => void flushOutbox(client));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flushOutbox(client);
  });
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

const sameScope = (a: NoteScope, b: NoteScope) =>
  a.project === b.project &&
  (a.song ?? '') === (b.song ?? '') &&
  (a.stage ?? '') === (b.stage ?? '');

export function usePendingNotes(scope: NoteScope): PendingNote[] {
  const all = useSyncExternalStore(
    subscribe,
    () => items,
    () => items,
  );
  const me = currentUser();
  return all.filter((p) => p.author === me && sameScope(p.scope, scope));
}

// явный выход: черновики на устройстве не остаются
export async function clearOutbox(): Promise<void> {
  resetRetry();
  await clear(store);
  await load();
}

// вошёл другой человек: черновики прежнего стираются, свои остаются
export async function dropForeignDrafts(userId: string): Promise<void> {
  for (const [id, note] of await entries<string, PendingNote>(store)) {
    if (note.author !== userId) await del(id, store);
  }
  await load();
}
