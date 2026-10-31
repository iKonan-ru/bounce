/// <reference path="../pb_data/types.d.ts" />

// Сохраняем рассчитанный момент публикации; дата становится самостоятельной в ее часовом поясе.
// SQL не запускает пересчет старых зависимостей при очистке основной публикации.
migrate((app) => {
  const posts = app.findRecordsByFilter(
    'video_posts',
    'anchor = "main"',
    '',
    0,
    0
  );
  for (const post of posts) {
    const scheduledAt = post.getString('scheduled_at');
    const day = scheduledAt
      ? new DateTime(scheduledAt)
          .time()
          .in(new Timezone(post.getString('timezone')))
          .format('2006-01-02')
      : '';
    app
      .db()
      .newQuery(
        'UPDATE video_posts SET anchor = {:anchor}, date = {:date}, offset = 0 WHERE id = {:id}'
      )
      .bind({
        anchor: 'date',
        date: day ? `${day} 00:00:00.000Z` : '',
        id: post.id,
      })
      .execute();
  }
  app.db().newQuery("UPDATE videos SET main_publication = ''").execute();
});
