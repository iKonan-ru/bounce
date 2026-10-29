import { useSyncExternalStore } from 'react';
import { checkIsAudioCached, keepAudio, stopKeepingAudio } from './audio-cache';
import { getBaseName } from './format';
import { getField, getNumberField } from './guards';
import { fetchId3 } from './id3';
import type { FileRecord } from './model';
import { pb } from './pb';

// Один плеер на всё приложение: запись играет дальше при переходах между страницами, а снизу
// видна полоса с ней. Плееры в заметках и в релизе - только пульты этого плеера.

/** Что играет - для системы (экран блокировки, центр управления, наушники) */
export interface AudioMeta {
  title?: string | undefined;
  artist?: string | undefined;
  album?: string | undefined;
  artwork?: string | undefined;
}

/** Закрытый файл записи */
export interface TrackFile {
  record: FileRecord;
  name: string;
}

/** Запись для плеера */
export interface Track {
  /** Одна и та же запись в разных местах - один ключ */
  key: string;
  name: string;
  /** Ссылка на закрытый файл собирается с новым файловым токеном при каждом запуске */
  file: TrackFile;
  meta?: AudioMeta | undefined;
  /** Сведения для системы - из тегов MP3, у остальных файлов - имя файла */
  shouldReadTags?: boolean | undefined;
  /** Откуда запустили: полоса внизу ведёт туда */
  origin?: string | undefined;
}

/** Громкость и выключенный звук; запоминаются на устройстве */
interface VolumeState {
  /** Громкость 0..1 */
  volume: number;
  isMuted: boolean;
}

/** Состояние плеера */
export interface PlayerState extends VolumeState {
  track: Track | null;
  isPlaying: boolean;
  /** Сколько секунд проиграно */
  current: number;
  /** Длина записи в секундах */
  duration: number;
  isFailed: boolean;
  /** Сведения для системы, с учётом тегов */
  meta: AudioMeta | undefined;
  /** Сколько записи уже на устройстве (0..1, lib/audio-cache.ts): 1 - играет и без сети */
  saved: number;
}

/** Ключ громкости в localStorage */
const VOLUME_KEY = 'bounce.volume';

/** Громкость по умолчанию: полная */
const DEFAULT_VOLUME: VolumeState = { volume: 1, isMuted: false };

/** Пробная громкость: на iPhone и iPad браузер её не примет */
const PROBE_VOLUME = 0.5;

/** Шаг перемотки кнопками системы, секунд */
const SEEK_STEP_SECONDS = 10;

/** Размер обложки для системы */
const ARTWORK_SIZE = '600x600';

/** Секунд в минуте */
const SECONDS_IN_MINUTE = 60;

/** Записи MP3 - у них читаются теги */
const MP3_RE = /\.mp3$/i;

/** Состояние без записи */
const IDLE_STATE: Omit<PlayerState, keyof VolumeState> = {
  track: null,
  isPlaying: false,
  current: 0,
  duration: 0,
  isFailed: false,
  meta: undefined,
  saved: 0,
};

/** Громкость в пределах 0..1 */
function clampVolume(volume: number): number {
  return Math.min(1, Math.max(0, volume));
}

/** Сохранённая громкость; нет хранилища - громкость по умолчанию */
function readVolume(): VolumeState {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(VOLUME_KEY) ?? 'null'
    );
    const volume = getNumberField(stored, 'volume');

    if (volume === undefined) {
      return DEFAULT_VOLUME;
    }

    return {
      volume: clampVolume(volume),
      isMuted: getField(stored, 'muted') === true,
    };
  } catch {
    return DEFAULT_VOLUME;
  }
}

/** Состояние плеера */
let state: PlayerState = { ...IDLE_STATE, ...readVolume() };

/** Подписчики состояния */
const listeners = new Set<() => void>();

/** Элемент audio, создаётся при первом запуске */
let audioElement: HTMLAudioElement | null = null;

/** Обложка из тегов - временная ссылка, её освобождаем при смене записи */
let artworkUrl: string | null = null;

/** Токен файла живёт несколько минут: при ошибке чтения берём новый и продолжаем с того же места */
let wasRetried = false;

/** Обновить состояние и сообщить подписчикам */
function setState(patch: Partial<PlayerState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) {
    listener();
  }
}

/** Отметить, что запись не играет */
function markFailed(): void {
  setState({ isFailed: true });
}

/** Отметить, что запись не играет и остановилась */
function markStopped(): void {
  setState({ isFailed: true, isPlaying: false });
}

/** Освободить ссылку на обложку из тегов */
function releaseArtwork(): void {
  if (artworkUrl) {
    URL.revokeObjectURL(artworkUrl);
  }

  artworkUrl = null;
}

/** Запись этого ключа сейчас в плеере */
function checkIsCurrentTrack(track: Track): boolean {
  return state.track?.key === track.key;
}

/**
 * Ссылка на файл записи с токеном
 *
 * Без сети токен не получить: сохранённая на устройстве запись играет и по ссылке без токена
 * (ключ кэша - адрес без токена)
 */
async function getFileSrc(track: Track): Promise<string> {
  try {
    const token = await pb.files.getToken();

    return pb.files.getURL(track.file.record, track.file.name, { token });
  } catch (error) {
    const bareUrl = pb.files.getURL(track.file.record, track.file.name);

    if (await checkIsAudioCached(bareUrl)) {
      return bareUrl;
    }

    throw error;
  }
}

/** Элемент audio плеера; при первом обращении создаётся и подписывается на события */
function getAudioElement(): HTMLAudioElement {
  if (audioElement) {
    return audioElement;
  }

  const element = new Audio();
  element.preload = 'metadata';
  element.volume = state.volume;
  element.muted = state.isMuted;
  const onDurationChange = (): void => {
    setState({ duration: element.duration });
  };
  element.addEventListener('loadedmetadata', onDurationChange);
  element.addEventListener('durationchange', onDurationChange);
  element.addEventListener('timeupdate', () =>
    setState({ current: element.currentTime })
  );
  element.addEventListener('play', () => {
    setState({ isPlaying: true, isFailed: false });
    setMediaState('playing');
  });
  element.addEventListener('pause', () => {
    setState({ isPlaying: false });
    setMediaState('paused');
  });
  element.addEventListener('ended', () => setState({ isPlaying: false }));
  element.addEventListener('seeked', updatePositionState);
  element.addEventListener('loadeddata', () => {
    // файл снова читается - следующая ошибка токена тоже лечится новым токеном
    wasRetried = false;
    updatePositionState();
  });
  element.addEventListener('error', () => void recoverPlayback());
  audioElement = element;

  return element;
}

/** Ошибка чтения: один раз пробуем с новым токеном с того же места */
async function recoverPlayback(): Promise<void> {
  const { track } = state;
  const element = audioElement;
  const hasSource = Boolean(element?.getAttribute('src'));

  if (!track || !element || !hasSource) {
    return;
  }

  if (wasRetried) {
    markStopped();

    return;
  }

  wasRetried = true;
  const resumeAt = state.current;
  try {
    element.src = await getFileSrc(track);
    element.currentTime = resumeAt;
    await element.play();
  } catch {
    markStopped();
  }
}

/** Прочитать теги MP3 и показать их системе */
async function readTags(track: Track, src: string): Promise<void> {
  const found = await fetchId3(src);

  if (!checkIsCurrentTrack(track) || !found) {
    return;
  }

  if (found.picture) {
    const pictureBlob = new Blob([new Uint8Array(found.picture.data)], {
      type: found.picture.mime,
    });
    artworkUrl = URL.createObjectURL(pictureBlob);
  }

  const meta: AudioMeta = {
    title: found.title,
    artist: found.artist,
    album: found.album,
    artwork: artworkUrl ?? undefined,
  };
  setState({ meta });
  announceTrack(track, meta);
}

/** Включить запись; та же запись - продолжить */
export async function playTrack(track: Track): Promise<void> {
  const element = getAudioElement();
  const isSameLoaded =
    checkIsCurrentTrack(track) && Boolean(element.getAttribute('src'));

  if (isSameLoaded) {
    await element.play().catch(markFailed);

    return;
  }

  releaseArtwork();
  wasRetried = false;
  // прежнюю запись больше не сохраняем на устройство
  stopKeepingAudio();
  setState({
    track,
    current: 0,
    duration: 0,
    isFailed: false,
    meta: track.meta,
    saved: 0,
  });
  try {
    const src = await getFileSrc(track);

    // пока брали токен, могли включить другую запись
    if (!checkIsCurrentTrack(track)) {
      return;
    }

    element.src = src;
    announceTrack(track, track.meta);
    await element.play();
    void keepAudio(src, (saved) => {
      if (checkIsCurrentTrack(track)) {
        setState({ saved });
      }
    });
    const shouldReadTags = track.shouldReadTags && MP3_RE.test(track.name);

    if (shouldReadTags) {
      void readTags(track, src);
    }
  } catch {
    markStopped();
  }
}

/**
 * Громкость меняется в самом приложении
 *
 * На iPhone и iPad браузер этого не позволяет - там громкость только кнопками устройства
 * (canSetVolume() = false)
 */
export function setVolume(volume: number, muted = false): void {
  const clamped = clampVolume(volume);
  const element = getAudioElement();
  element.volume = clamped;
  element.muted = muted;
  setState({ volume: clamped, isMuted: muted });
  try {
    localStorage.setItem(
      VOLUME_KEY,
      JSON.stringify({ volume: clamped, muted })
    );
  } catch (error) {
    // без хранилища громкость просто не запомнится
    console.error(error);
  }
}

/** Меняется ли громкость в приложении; null - ещё не проверяли */
let isVolumeSupported: boolean | null = null;

/** Меняется ли громкость в приложении (на iPhone и iPad - нет) */
export function checkIsVolumeAdjustable(): boolean {
  if (isVolumeSupported === null) {
    const probe = new Audio();
    probe.volume = PROBE_VOLUME;
    isVolumeSupported = probe.volume === PROBE_VOLUME;
  }

  return isVolumeSupported;
}

/** Пауза или продолжение */
export function togglePlay(): void {
  const element = audioElement;

  if (!element || !state.track) {
    return;
  }

  if (!element.paused) {
    element.pause();

    return;
  }

  void element.play().catch(markFailed);
}

/** Перемотать на seconds секунд от начала */
export function seekTo(seconds: number): void {
  const element = audioElement;

  if (!element) {
    return;
  }

  const maxSeconds = element.duration || seconds;
  element.currentTime = Math.max(0, Math.min(maxSeconds, seconds));
  setState({ current: element.currentTime });
}

/** Остановить и убрать запись из плеера */
export function stopPlayer(): void {
  stopKeepingAudio();
  const element = audioElement;

  if (element) {
    element.pause();
    element.removeAttribute('src');
    element.load();
  }

  releaseArtwork();
  setState(IDLE_STATE);

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = null;
  }
}

/** Состояние плеера */
export function usePlayer(): PlayerState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    () => state,
    () => state
  );
}

/** Обложка для системы: своя из тегов - как есть, с сервера - с размером */
function getArtwork(meta: AudioMeta | undefined): MediaImage[] {
  const artwork = meta?.artwork;

  if (!artwork) {
    return [];
  }

  if (artwork.startsWith('blob:')) {
    return [{ src: artwork }];
  }

  return [{ src: artwork, sizes: ARTWORK_SIZE }];
}

/** Показать запись системе и подключить кнопки управления */
function announceTrack(track: Track, meta: AudioMeta | undefined): void {
  if (!('mediaSession' in navigator)) {
    return;
  }

  const { mediaSession } = navigator;
  try {
    mediaSession.metadata = new MediaMetadata({
      title: meta?.title || getBaseName(track.name),
      artist: meta?.artist ?? '',
      album: meta?.album ?? '',
      artwork: getArtwork(meta),
    });
    mediaSession.setActionHandler('play', togglePlay);
    mediaSession.setActionHandler('pause', togglePlay);
    mediaSession.setActionHandler('stop', stopPlayer);
    mediaSession.setActionHandler('seekbackward', (details) => {
      seekTo(state.current - (details.seekOffset ?? SEEK_STEP_SECONDS));
    });
    mediaSession.setActionHandler('seekforward', (details) => {
      seekTo(state.current + (details.seekOffset ?? SEEK_STEP_SECONDS));
    });
    mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        seekTo(details.seekTime);
      }
    });
  } catch (error) {
    // старые браузеры знают не все действия - без них просто нет кнопок в системе
    console.error(error);
  }
}

/** Сообщить системе, играет ли запись */
function setMediaState(playbackState: MediaSessionPlaybackState): void {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = playbackState;
  }

  updatePositionState();
}

/** Сообщить системе место в записи */
function updatePositionState(): void {
  const element = audioElement;
  const hasMediaSession = 'mediaSession' in navigator;

  if (!element || !hasMediaSession || !Number.isFinite(element.duration)) {
    return;
  }

  try {
    navigator.mediaSession.setPositionState({
      duration: element.duration,
      position: Math.min(element.currentTime, element.duration),
      playbackRate: element.playbackRate,
    });
  } catch (error) {
    // позиция вне длительности на мгновение после перемотки - пропускаем
    console.error(error);
  }
}

/** Время записи: "3:07" */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const minutes = Math.floor(seconds / SECONDS_IN_MINUTE);
  const restSeconds = Math.floor(seconds % SECONDS_IN_MINUTE);

  return `${minutes}:${String(restSeconds).padStart(2, '0')}`;
}

// выход из приложения останавливает запись
pb.authStore.onChange(() => {
  if (!pb.authStore.token && state.track) {
    stopPlayer();
  }
});
