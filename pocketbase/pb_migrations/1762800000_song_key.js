/// <reference path="../pb_data/types.d.ts" />

// Тональность песни - только из списка: тоника и лад ("C", "F#", "Am", "G#m"). Записанное раньше
// приводится к этому виду, нераспознанное очищается.

/** Тоники мажорных тональностей */
const MAJOR_TONICS = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

/** Тоники минорных тональностей */
const MINOR_TONICS = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'Bb',
  'B',
];

/** Допустимая тональность: мажорная тоника или минорная с "m" */
const KEY_PATTERN = `^((${MAJOR_TONICS.join('|')})|(${MINOR_TONICS.join('|')})m)$`;

/** Тоники под другим именем: к какой из MAJOR_TONICS они приводятся */
const SAME_TONICS = {
  Db: 'C#',
  'D#': 'Eb',
  Gb: 'F#',
  'G#': 'Ab',
  'A#': 'Bb',
  Cb: 'B',
  'B#': 'C',
  Fb: 'E',
  'E#': 'F',
};

/** Записи лада, означающие минор */
const MINOR_MODES = ['m', 'min', 'minor', 'moll'];

/** Тональность в виде из списка; нераспознанная - пустая строка */
function normalizeKey(rawKey) {
  const match = String(rawKey || '')
    .trim()
    .match(/^([A-Ga-g])([#b]?)\s*(m|min|minor|maj|major|dur|moll)?$/);

  if (!match) {
    return '';
  }

  const note = match[1].toUpperCase() + (match[2] || '');
  const isMajorTonic = MAJOR_TONICS.includes(note);
  const tonic = isMajorTonic ? note : SAME_TONICS[note];

  if (!tonic) {
    return '';
  }

  const mode = (match[3] || '').toLowerCase();
  const isMinor = MINOR_MODES.includes(mode);

  if (!isMinor) {
    return tonic;
  }

  // в списке минорных тональностей Ab записана как G#
  const minorTonic = tonic === 'Ab' ? 'G#' : tonic;

  return `${minorTonic}m`;
}

migrate(
  (app) => {
    for (const song of app.findRecordsByFilter(
      'songs',
      'key != ""',
      '',
      0,
      0
    )) {
      const normalizedKey = normalizeKey(song.getString('key'));

      if (normalizedKey !== song.getString('key')) {
        song.set('key', normalizedKey);
        app.saveNoValidate(song);
      }
    }
    const songs = app.findCollectionByNameOrId('songs');
    const keyField = songs.fields.getByName('key');
    keyField.pattern = KEY_PATTERN;
    keyField.max = 3;
    app.save(songs);
  },
  (app) => {
    const songs = app.findCollectionByNameOrId('songs');
    const keyField = songs.fields.getByName('key');
    keyField.pattern = '';
    keyField.max = 20;
    app.save(songs);
  }
);
