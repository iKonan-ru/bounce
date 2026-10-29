import { clear, createStore, del, entries, get, set } from 'idb-keyval';
import { useSyncExternalStore } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { getSendVerdict, SendVerdict } from './errors';
import { MINUTE_MS, SECOND_MS } from './format';
import { getNewRecordId } from './id';
import { createNote, type NoteScope } from './notes';
import { Collections, pb } from './pb';
import { queryKeys } from './query-keys';

// Черновики заметок без сети: заметка с файлами ложится в IndexedDB и уходит на сервер, когда
// связь вернётся - по событию online, возвращению к приложению, входу, удачной отправке из формы
// и по таймеру, пока сервер недоступен.
//
// Черновик принадлежит автору: другой человек на этом устройстве его не видит и не отправляет.
// Явный выход (кнопка "Выйти") стирает черновики; потерянная сессия (её закрыли, токен истёк) -
// нет: после входа того же человека они уйдут. Вход другого человека стирает чужие.

/** Заметка в очереди на отправку */
export interface PendingNote {
  /** Он же id записи на сервере: повтор после потерянного ответа не создаёт вторую заметку */
  id: string;
  scope: NoteScope;
  author: string;
  text: string;
  images: File[];
  audio: File[];
  created: string;
  /** Сервер отказал (не сеть): заметка ждёт, пока её не удалят. Имя поля хранится на устройствах */
  rejected?: boolean;
}

/** Новая заметка для очереди */
export interface QueuedNote extends Omit<PendingNote, 'id' | 'created'> {
  /** Id, с которым заметку уже пробовали отправить (если пробовали) */
  id?: string;
}

/** Итог прохода по очереди */
interface FlushResult {
  sentCount: number;
  shouldRetry: boolean;
}

/** Первый повтор, пока сервер недоступен, а браузер считает, что сеть есть (события online не будет) */
const RETRY_FIRST = 30 * SECOND_MS;

/** Самая длинная пауза между повторами */
const RETRY_MAX = 10 * MINUTE_MS;

/** Во сколько раз растёт пауза между повторами */
const RETRY_BACKOFF = 2;

/** Блокировка очереди на все окна приложения */
const OUTBOX_LOCK = 'bounce-outbox';

/** Хранилище очереди в IndexedDB */
const store = createStore('bounce-outbox', 'notes');

/** Подписчики изменений очереди */
const listeners = new Set<() => void>();

/** Заметки в очереди по времени создания */
let pendingNotes: PendingNote[] = [];

/** Очередь сейчас отправляется */
let isFlushing = false;

/** Отправку попросили, пока шла предыдущая (новый черновик, вход): после неё - ещё один проход */
let isFlushRequested = false;

/** Текущая пауза перед повтором; 0 - повтор не нужен */
let retryDelay = 0;

/** Таймер повтора */
let retryTimer: ReturnType<typeof setTimeout> | undefined;

/** Сообщить подписчикам об изменении очереди */
function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Перечитать очередь из хранилища */
async function loadPending(): Promise<void> {
  const stored = await entries<string, PendingNote>(store);
  pendingNotes = stored
    .map(([, note]) => note)
    .sort((first, second) => first.created.localeCompare(second.created));
  notifyListeners();
}

/** Id вошедшего пользователя; без сессии - пусто */
function getCurrentUserId(): string {
  if (!pb.authStore.isValid) {
    return '';
  }

  return pb.authStore.record?.id ?? '';
}

/** Положить заметку в очередь */
export async function queueNote(note: QueuedNote): Promise<void> {
  const pending: PendingNote = {
    ...note,
    id: note.id ?? getNewRecordId(),
    created: new Date().toISOString(),
  };
  await set(pending.id, pending, store);

  if (isFlushing) {
    isFlushRequested = true;
  }

  await loadPending();
}

/** Удалить заметку из очереди */
export async function dropPending(id: string): Promise<void> {
  await del(id, store);
  await loadPending();
}

/** Повтор через 30 секунд, потом реже, до 10 минут */
function scheduleRetry(client: QueryClient): void {
  clearTimeout(retryTimer);

  if (retryDelay) {
    retryDelay = Math.min(retryDelay * RETRY_BACKOFF, RETRY_MAX);
  } else {
    retryDelay = RETRY_FIRST;
  }

  retryTimer = setTimeout(() => void flushOutbox(client), retryDelay);
}

/** Повтор больше не нужен */
function resetRetry(): void {
  clearTimeout(retryTimer);
  retryTimer = undefined;
  retryDelay = 0;
}

/** Запланировать повтор или снять его */
function updateRetry(client: QueryClient, shouldRetry: boolean): void {
  if (shouldRetry) {
    scheduleRetry(client);

    return;
  }

  resetRetry();
}

/**
 * Сессия жива
 *
 * Создание заметки с закрытой сессией PocketBase отклоняет так же, как без доступа к проекту
 * (400 без подробностей). Отказ считается окончательным, только если сессия жива
 */
async function checkIsSessionAlive(): Promise<boolean> {
  try {
    await pb.collection(Collections.Users).authRefresh();

    return true;
  } catch {
    return false;
  }
}

/**
 * Одна очередь на все окна приложения: черновик с аудио не грузится дважды из двух вкладок
 *
 * Пока очередь отправляет одно окно, другое пропускает свой проход
 */
async function runExclusively(run: () => Promise<void>): Promise<void> {
  const hasLocks = typeof navigator !== 'undefined' && Boolean(navigator.locks);

  if (!hasLocks) {
    await run();

    return;
  }

  await navigator.locks.request(
    OUTBOX_LOCK,
    { ifAvailable: true },
    async (lock) => {
      if (lock) {
        await run();
      }
    }
  );
}

/** Итог отправки одной заметки */
async function sendPending(note: PendingNote): Promise<SendVerdict> {
  try {
    await createNote(pb, note.scope, note.author, {
      id: note.id,
      text: note.text,
      images: note.images,
      audio: note.audio,
    });

    return SendVerdict.Sent;
  } catch (error) {
    const verdict = getSendVerdict(error);

    if (verdict !== SendVerdict.Reject) {
      return verdict;
    }

    // с закрытой сессией отказ не окончательный: заметка подождёт входа
    return (await checkIsSessionAlive())
      ? SendVerdict.Reject
      : SendVerdict.Retry;
  }
}

/** Отправить очередь: сколько заметок ушло и нужен ли повтор */
async function sendQueue(): Promise<FlushResult> {
  let sentCount = 0;
  for (const note of pendingNotes) {
    // чужие черновики и отклонённые не отправляются; сменился пользователь - тоже стоп
    const isSkipped = note.rejected || note.author !== getCurrentUserId();

    if (isSkipped) {
      continue;
    }

    const verdict = await sendPending(note);

    // сеть, сервер или сессия недоступны - остальные черновики тоже подождут
    if (verdict === SendVerdict.Retry) {
      return { sentCount, shouldRetry: true };
    }

    // пока шла отправка, черновик удалили (кнопкой или выходом) - не возвращаем его
    const isStillQueued = Boolean(await get(note.id, store));

    if (!isStillQueued) {
      continue;
    }

    if (verdict === SendVerdict.Reject) {
      await set(note.id, { ...note, rejected: true }, store);
      continue;
    }

    await del(note.id, store);
    sentCount++;
  }

  return { sentCount, shouldRetry: false };
}

/** Отправить черновики из очереди */
export async function flushOutbox(client: QueryClient): Promise<void> {
  if (!navigator.onLine || !getCurrentUserId()) {
    return;
  }

  if (isFlushing) {
    isFlushRequested = true;

    return;
  }

  isFlushing = true;
  isFlushRequested = false;
  let result: FlushResult = { sentCount: 0, shouldRetry: false };
  try {
    await runExclusively(async () => {
      await loadPending();
      result = await sendQueue();
    });
  } finally {
    try {
      await loadPending();

      if (result.sentCount > 0) {
        await client.invalidateQueries({ queryKey: queryKeys.notes.all });
      }
    } finally {
      isFlushing = false;
    }
    updateRetry(client, result.shouldRetry);

    if (isFlushRequested) {
      void flushOutbox(client);
    }
  }
}

/** После refreshAuth (ready): с закрытой сессией первый проход только пометил бы черновики отклонёнными */
export function startOutbox(
  client: QueryClient,
  ready: Promise<unknown>
): void {
  const flush = (): void => {
    void flushOutbox(client);
  };
  void Promise.all([loadPending(), ready.catch(console.error)]).then(flush);
  window.addEventListener('online', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      flush();
    }
  });
}

/** Подписка на изменения очереди */
function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);

  return () => listeners.delete(onChange);
}

/** Та же лента: проект, песня и этап совпадают */
function checkIsSameScope(first: NoteScope, second: NoteScope): boolean {
  return [
    first.project === second.project,
    (first.song ?? '') === (second.song ?? ''),
    (first.stage ?? '') === (second.stage ?? ''),
  ].every(Boolean);
}

/** Свои заметки в очереди для этой ленты */
export function usePendingNotes(scope: NoteScope): PendingNote[] {
  const allPending = useSyncExternalStore(
    subscribe,
    () => pendingNotes,
    () => pendingNotes
  );
  const userId = getCurrentUserId();

  return allPending.filter(
    (note) => note.author === userId && checkIsSameScope(note.scope, scope)
  );
}

/** Явный выход: черновики на устройстве не остаются */
export async function clearOutbox(): Promise<void> {
  resetRetry();
  await clear(store);
  await loadPending();
}

/** Вошёл другой человек: черновики прежнего стираются, свои остаются */
export async function dropForeignDrafts(userId: string): Promise<void> {
  for (const [id, note] of await entries<string, PendingNote>(store)) {
    if (note.author !== userId) {
      await del(id, store);
    }
  }
  await loadPending();
}
