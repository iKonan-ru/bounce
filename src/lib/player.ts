import { useSyncExternalStore } from 'react';
import { isAudioCached, keepAudio, stopKeepingAudio } from './audio-cache';
import { baseName } from './format';
import { fetchId3 } from './id3';
import type { FileRecord } from './model';
import { pb } from './pb';

// Один плеер на всё приложение: запись играет дальше при переходах между страницами, а снизу
// видна полоса с ней. Плееры в заметках и в релизе - только пульты этого плеера.

// Что играет - для системы (экран блокировки, центр управления, наушники).
export type AudioMeta = {
  title?: string | undefined;
  artist?: string | undefined;
  album?: string | undefined;
  artwork?: string | undefined;
};

export type Track = {
  // одна и та же запись в разных местах - один ключ
  key: string;
  name: string;
  // ссылка на закрытый файл собирается с новым файловым токеном при каждом запуске
  file: { record: FileRecord; name: string };
  meta?: AudioMeta | undefined;
  // сведения для системы - из тегов MP3, у остальных файлов - имя файла
  readTags?: boolean | undefined;
  // откуда запустили: полоса внизу ведёт туда
  origin?: string | undefined;
};

export type PlayerState = {
  track: Track | null;
  playing: boolean;
  current: number;
  duration: number;
  failed: boolean;
  // сведения для системы, с учётом тегов
  meta: AudioMeta | undefined;
  // громкость 0..1 и выключенный звук; запоминаются на устройстве
  volume: number;
  muted: boolean;
  // сколько записи уже на устройстве (0..1, lib/audio-cache.ts): 1 - играет и без сети
  saved: number;
};

const VOLUME_KEY = 'bounce.volume';

function readVolume(): { volume: number; muted: boolean } {
  try {
    const v = JSON.parse(localStorage.getItem(VOLUME_KEY) ?? 'null');
    if (v && typeof v.volume === 'number') {
      return { volume: Math.min(1, Math.max(0, v.volume)), muted: v.muted === true };
    }
  } catch {
    // нет хранилища - громкость по умолчанию
  }
  return { volume: 1, muted: false };
}

let state: PlayerState = {
  track: null,
  playing: false,
  current: 0,
  duration: 0,
  failed: false,
  meta: undefined,
  saved: 0,
  ...readVolume(),
};
const listeners = new Set<() => void>();
let el: HTMLAudioElement | null = null;
// обложка из тегов - временная ссылка, её освобождаем при смене записи
let blobArt: string | null = null;
// токен файла живёт несколько минут: при ошибке чтения берём новый и продолжаем с того же места
let retried = false;

function set(patch: Partial<PlayerState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

// Без сети токен не получить: сохранённая на устройстве запись играет и по ссылке без токена
// (ключ кэша - адрес без токена).
async function fileSrc(track: Track): Promise<string> {
  try {
    const token = await pb.files.getToken();
    return pb.files.getURL(track.file.record, track.file.name, { token });
  } catch (e) {
    const bare = pb.files.getURL(track.file.record, track.file.name);
    if (await isAudioCached(bare)) return bare;
    throw e;
  }
}

function audio(): HTMLAudioElement {
  if (el) return el;
  const a = new Audio();
  a.preload = 'metadata';
  a.volume = state.volume;
  a.muted = state.muted;
  a.addEventListener('loadedmetadata', () => set({ duration: a.duration }));
  a.addEventListener('durationchange', () => set({ duration: a.duration }));
  a.addEventListener('timeupdate', () => set({ current: a.currentTime }));
  a.addEventListener('play', () => {
    set({ playing: true, failed: false });
    mediaState('playing');
  });
  a.addEventListener('pause', () => {
    set({ playing: false });
    mediaState('paused');
  });
  a.addEventListener('ended', () => set({ playing: false }));
  a.addEventListener('seeked', position);
  a.addEventListener('loadeddata', () => {
    // файл снова читается - следующая ошибка токена тоже лечится новым токеном
    retried = false;
    position();
  });
  a.addEventListener('error', () => void recover());
  el = a;
  return a;
}

async function recover() {
  const track = state.track;
  const a = el;
  if (!track || !a || !a.getAttribute('src')) return;
  if (retried) {
    set({ failed: true, playing: false });
    return;
  }
  retried = true;
  const at = state.current;
  try {
    a.src = await fileSrc(track);
    a.currentTime = at;
    await a.play();
  } catch {
    set({ failed: true, playing: false });
  }
}

export async function playTrack(track: Track) {
  const a = audio();
  if (state.track?.key === track.key && a.getAttribute('src')) {
    await a.play().catch(() => set({ failed: true }));
    return;
  }
  if (blobArt) URL.revokeObjectURL(blobArt);
  blobArt = null;
  retried = false;
  // прежнюю запись больше не сохраняем на устройство
  stopKeepingAudio();
  set({ track, current: 0, duration: 0, failed: false, meta: track.meta, saved: 0 });
  try {
    const src = await fileSrc(track);
    // пока брали токен, могли включить другую запись
    if (state.track?.key !== track.key) return;
    a.src = src;
    announce(track, track.meta);
    await a.play();
    void keepAudio(src, (saved) => {
      if (state.track?.key === track.key) set({ saved });
    });
    if (track.readTags && /\.mp3$/i.test(track.name)) void readTags(track, src);
  } catch {
    set({ failed: true, playing: false });
  }
}

async function readTags(track: Track, src: string) {
  const found = await fetchId3(src);
  if (state.track?.key !== track.key || !found) return;
  if (found.picture) {
    blobArt = URL.createObjectURL(
      new Blob([new Uint8Array(found.picture.data)], { type: found.picture.mime }),
    );
  }
  const meta: AudioMeta = {
    title: found.title,
    artist: found.artist,
    album: found.album,
    artwork: blobArt ?? undefined,
  };
  set({ meta });
  announce(track, meta);
}

// Громкость меняется в самом приложении; на iPhone и iPad браузер этого не позволяет - там
// громкость только кнопками устройства (canSetVolume() = false).
export function setVolume(volume: number, muted = false) {
  const v = Math.min(1, Math.max(0, volume));
  const a = audio();
  a.volume = v;
  a.muted = muted;
  set({ volume: v, muted });
  try {
    localStorage.setItem(VOLUME_KEY, JSON.stringify({ volume: v, muted }));
  } catch {
    // без хранилища громкость просто не запомнится
  }
}

let volumeWorks: boolean | null = null;
export function canSetVolume(): boolean {
  if (volumeWorks === null) {
    const probe = new Audio();
    probe.volume = 0.5;
    volumeWorks = probe.volume === 0.5;
  }
  return volumeWorks;
}

export function togglePlay() {
  const a = el;
  if (!a || !state.track) return;
  if (a.paused) void a.play().catch(() => set({ failed: true }));
  else a.pause();
}

export function seekTo(t: number) {
  const a = el;
  if (!a) return;
  a.currentTime = Math.max(0, Math.min(a.duration || t, t));
  set({ current: a.currentTime });
}

export function stopPlayer() {
  stopKeepingAudio();
  const a = el;
  if (a) {
    a.pause();
    a.removeAttribute('src');
    a.load();
  }
  if (blobArt) URL.revokeObjectURL(blobArt);
  blobArt = null;
  set({
    track: null,
    playing: false,
    current: 0,
    duration: 0,
    failed: false,
    meta: undefined,
    saved: 0,
  });
  if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
}

export function usePlayer(): PlayerState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

function announce(track: Track, meta: AudioMeta | undefined) {
  if (!('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  try {
    ms.metadata = new MediaMetadata({
      title: meta?.title || baseName(track.name),
      artist: meta?.artist ?? '',
      album: meta?.album ?? '',
      artwork: meta?.artwork
        ? [
            meta.artwork.startsWith('blob:')
              ? { src: meta.artwork }
              : { src: meta.artwork, sizes: '600x600' },
          ]
        : [],
    });
    ms.setActionHandler('play', () => togglePlay());
    ms.setActionHandler('pause', () => togglePlay());
    ms.setActionHandler('stop', () => stopPlayer());
    ms.setActionHandler('seekbackward', (d) => seekTo(state.current - (d.seekOffset ?? 10)));
    ms.setActionHandler('seekforward', (d) => seekTo(state.current + (d.seekOffset ?? 10)));
    ms.setActionHandler('seekto', (d) => d.seekTime !== undefined && seekTo(d.seekTime));
  } catch {
    // старые браузеры знают не все действия - без них просто нет кнопок в системе
  }
}

function mediaState(s: 'playing' | 'paused') {
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = s;
  position();
}

function position() {
  const a = el;
  if (!a || !('mediaSession' in navigator) || !Number.isFinite(a.duration)) return;
  try {
    navigator.mediaSession.setPositionState({
      duration: a.duration,
      position: Math.min(a.currentTime, a.duration),
      playbackRate: a.playbackRate,
    });
  } catch {
    // позиция вне длительности на мгновение после перемотки - пропускаем
  }
}

export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// выход из приложения останавливает запись
pb.authStore.onChange(() => {
  if (!pb.authStore.token && state.track) stopPlayer();
});
