import type { QueryClient } from '@tanstack/react-query';
import { createStore, del, entries, set } from 'idb-keyval';
import { ClientResponseError } from 'pocketbase';
import { useSyncExternalStore } from 'react';
import { newRecordId } from './id';
import { createNote, type NoteScope } from './notes';
import { pb } from './pb';

// Черновики заметок без сети: заметка с файлами ложится в IndexedDB и уходит на сервер, когда
// сеть появится (событие online, запуск приложения, следующая отправка).

export type PendingNote = {
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

export async function queueNote(note: Omit<PendingNote, 'id' | 'created'>): Promise<void> {
  const item: PendingNote = { ...note, id: newRecordId(), created: new Date().toISOString() };
  await set(item.id, item, store);
  await load();
}

export async function dropPending(id: string): Promise<void> {
  await del(id, store);
  await load();
}

// обрыв сети, а не ответ сервера
export function isNetworkError(e: unknown): boolean {
  if (e instanceof ClientResponseError) return e.status === 0;
  return e instanceof Error && /сеть|network|fetch/i.test(e.message);
}

let flushing = false;

export async function flushOutbox(client: QueryClient): Promise<void> {
  if (flushing || !navigator.onLine || !pb.authStore.isValid) return;
  flushing = true;
  let sent = 0;
  try {
    await load();
    for (const item of items) {
      if (item.rejected) continue;
      try {
        await createNote(pb, item.scope, item.author, {
          text: item.text,
          images: item.images,
          audio: item.audio,
        });
        await del(item.id, store);
        sent++;
      } catch (e) {
        if (isNetworkError(e)) break;
        await set(item.id, { ...item, rejected: true }, store);
      }
    }
  } finally {
    flushing = false;
    await load();
    if (sent > 0) await client.invalidateQueries({ queryKey: ['notes'] });
  }
}

export function startOutbox(client: QueryClient): void {
  void load().then(() => flushOutbox(client));
  window.addEventListener('online', () => void flushOutbox(client));
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
  return all.filter((p) => sameScope(p.scope, scope));
}

// выход: чужие черновики на устройстве не остаются
export async function clearOutbox(): Promise<void> {
  for (const item of items) await del(item.id, store);
  await load();
}
