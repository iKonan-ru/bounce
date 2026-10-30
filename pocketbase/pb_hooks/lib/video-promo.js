/** Явное применение добавляет только отсутствующие элементы шаблона */
function applyPromo(event) {
  return event.app.runInTransaction((app) => {
    const video = app.findRecordById('videos', event.request.pathValue('id'));
    const project = app.findRecordById('projects', video.getString('project'));
    const workers = [
      project.getString('owner'),
      ...project.getStringSlice('editors'),
      ...project.getStringSlice('contributors'),
    ];

    if (
      !event.auth.getBool('totp_enabled') ||
      event.auth.getBool('disabled') ||
      !workers.includes(event.auth.id)
    ) {
      throw new ForbiddenError('Недостаточно прав для изменения публикаций.');
    }

    const templates = app.findRecordsByFilter(
      'promo_templates',
      'project = {:project} && direction = "video"',
      'offset,created',
      0,
      0,
      { project: project.id }
    );

    if (!templates.length) {
      throw new BadRequestError('В промо-плане видео пока нет публикаций.');
    }

    let added = 0;
    for (const template of templates) {
      if (
        app.findRecordsByFilter(
          'video_posts',
          'video = {:video} && source_template = {:template}',
          '',
          1,
          0,
          { video: video.id, template: template.id }
        ).length
      ) {
        continue;
      }

      const post = new Record(app.findCollectionByNameOrId('video_posts'));
      for (const field of [
        'title',
        'account',
        'anchor',
        'date',
        'time',
        'timezone',
        'offset',
      ]) {
        post.set(field, template.get(field));
      }
      post.set('project', project.id);
      post.set('video', video.id);
      post.set('author', event.auth.id);
      post.set('status', 'idea');
      post.set('text', template.getString('comment'));
      post.set('source_template', template.id);
      app.save(post);
      added++;
    }

    return event.json(200, { added });
  });
}
module.exports = { applyPromo };
