import type PocketBase from 'pocketbase';
import type { Finding } from './model';
import { collection } from './pb';
import type { FindingsCategoryOptions, FindingsInstrumentOptions } from './pb-types';
import { sendRecordForm } from './upload';

export type Instrument = FindingsInstrumentOptions;
export type Category = FindingsCategoryOptions;

export const INSTRUMENT_LABEL: Record<Instrument, string> = {
  vocals: 'Вокал',
  guitar: 'Гитара',
  bass: 'Бас',
  drums: 'Барабаны',
  synths: 'Синтезаторы',
  mix: 'Сведение',
  master: 'Мастер',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  preamp: 'Преамп',
  processor: 'Процессор',
  cabinet: 'Кабинет',
  mic: 'Микрофон',
  plugin: 'Плагин',
  technique: 'Манера исполнения',
  other: 'Другое',
};

export const INSTRUMENTS: Instrument[] = [
  'vocals',
  'guitar',
  'bass',
  'drums',
  'synths',
  'mix',
  'master',
];
export const CATEGORIES: Category[] = [
  'preamp',
  'processor',
  'cabinet',
  'mic',
  'plugin',
  'technique',
  'other',
];

export type FindingInput = {
  title: string;
  description: string;
  settings: string;
  instrument: Instrument | '';
  category: Category | '';
  tags: string[];
  library: boolean;
  song: string;
  stage: string;
  newImages: ReadonlyArray<File | Blob>;
  removeImages: ReadonlyArray<string>;
};

// теги из строки "тёплый, ламповый, #дабл" - без решёток, без повторов
export function parseTags(input: string): string[] {
  const out: string[] = [];
  for (const raw of input.split(/[,\n]/)) {
    const t = raw.trim().replace(/^#+/, '').toLowerCase();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

function toForm(input: FindingInput): FormData {
  const form = new FormData();
  form.set('title', input.title.trim());
  form.set('description', input.description.trim());
  form.set('settings', input.settings.trim());
  form.set('instrument', input.instrument);
  form.set('category', input.category);
  form.set('tags', JSON.stringify(input.tags));
  form.set('library', input.library ? 'true' : 'false');
  form.set('song', input.song);
  form.set('stage', input.stage);
  for (const f of input.newImages) form.append('images+', f);
  for (const name of input.removeImages) form.append('images-', name);
  return form;
}

export function saveFinding(
  client: PocketBase,
  target: { id: string } | { project: string; author: string },
  input: FindingInput,
  onProgress?: (fraction: number) => void,
): Promise<Finding> {
  const form = toForm(input);
  const browser = onProgress && typeof XMLHttpRequest !== 'undefined';
  if ('id' in target) {
    return browser
      ? sendRecordForm<Finding>('findings', form, { id: target.id, onProgress })
      : collection(client, 'findings').update<Finding>(target.id, form);
  }
  form.set('project', target.project);
  form.set('author', target.author);
  return browser
    ? sendRecordForm<Finding>('findings', form, { onProgress })
    : collection(client, 'findings').create<Finding>(form);
}

// поиск по заголовку, описанию, настройкам и тегам
export function findingsFilter(
  client: PocketBase,
  project: string,
  opts: { text: string; instrument: Instrument | ''; category: Category | ''; library: boolean },
): string {
  const parts = [client.filter('project = {:project}', { project })];
  const q = opts.text.trim();
  if (q) {
    parts.push(
      client.filter('(title ~ {:q} || description ~ {:q} || settings ~ {:q} || tags ~ {:q})', {
        q,
      }),
    );
  }
  if (opts.instrument) parts.push(client.filter('instrument = {:i}', { i: opts.instrument }));
  if (opts.category) parts.push(client.filter('category = {:c}', { c: opts.category }));
  if (opts.library) parts.push('library = true');
  return parts.join(' && ');
}
