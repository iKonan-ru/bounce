/** Поля релиза, которые сохраняются без изменений при выключенном выпуске */
const RELEASE_FIELDS = [
  'target_release',
  'release_cover',
  'release_audio',
  'release_audio_name',
  'bandlink',
];

/** Статусы, доступные только при включенном выпуске */
const RELEASE_STATUSES = ['sent', 'released'];

/** Выпуск включен в исходном проекте записи */
function checkIsEnabled(app, projectId) {
  const project = app.findRecordById('projects', projectId);

  return (
    project.getBool('music_release_enabled') &&
    project.getStringSlice('directions').includes('music')
  );
}

/** Скрытые релизные данные нельзя изменить через старый клиент или прямой запрос */
function validateSong(app, song) {
  if (checkIsEnabled(app, song.getString('project'))) {
    return true;
  }

  const before = song.original();
  const hasChangedFields = RELEASE_FIELDS.some(
    (field) =>
      JSON.stringify(song.get(field)) !== JSON.stringify(before.get(field))
  );
  const status = song.getString('status');
  const hasNewReleaseStatus =
    RELEASE_STATUSES.includes(status) && status !== before.getString('status');

  if (hasChangedFields || hasNewReleaseStatus) {
    throw new BadRequestError(
      'Сначала включите выпуск и продвижение песен в настройках проекта.'
    );
  }

  return false;
}

/** Публикации и промо-шаблоны недоступны для изменения, пока выпуск выключен */
function validatePromotion(app, record) {
  if (record.getString('direction') === 'video') {
    throw new BadRequestError('Видеопромо пока недоступно.');
  }

  if (!checkIsEnabled(app, record.getString('project'))) {
    throw new BadRequestError(
      'Выпуск и продвижение песен выключены в настройках проекта.'
    );
  }
}

module.exports = { checkIsEnabled, validateSong, validatePromotion };
