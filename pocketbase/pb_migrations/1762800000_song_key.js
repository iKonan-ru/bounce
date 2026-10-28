/// <reference path="../pb_data/types.d.ts" />

// Тональность песни - только из списка: тоника и лад ("C", "F#", "Am", "G#m"). Записанное раньше
// приводится к этому виду, нераспознанное очищается.

const MAJOR = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const PATTERN = `^((${MAJOR.join('|')})|(${MINOR.join('|')})m)$`;

function normalize(raw) {
  const m = String(raw || '')
    .trim()
    .match(/^([A-Ga-g])([#b]?)\s*(m|min|minor|maj|major|dur|moll)?$/);
  if (!m) return '';
  const same = {
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
  const note = m[1].toUpperCase() + (m[2] || '');
  const tonic = MAJOR.indexOf(note) >= 0 ? note : same[note];
  if (!tonic) return '';
  const mode = (m[3] || '').toLowerCase();
  const minor = mode === 'm' || mode === 'min' || mode === 'minor' || mode === 'moll';
  if (!minor) return tonic;
  return `${tonic === 'Ab' ? 'G#' : tonic}m`;
}

migrate(
  (app) => {
    for (const song of app.findRecordsByFilter('songs', 'key != ""', '', 0, 0)) {
      const next = normalize(song.getString('key'));
      if (next !== song.getString('key')) {
        song.set('key', next);
        app.saveNoValidate(song);
      }
    }
    const songs = app.findCollectionByNameOrId('songs');
    const key = songs.fields.getByName('key');
    key.pattern = PATTERN;
    key.max = 3;
    app.save(songs);
  },
  (app) => {
    const songs = app.findCollectionByNameOrId('songs');
    const key = songs.fields.getByName('key');
    key.pattern = '';
    key.max = 20;
    app.save(songs);
  },
);
