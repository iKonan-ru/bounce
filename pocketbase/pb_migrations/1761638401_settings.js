/// <reference path="../pb_data/types.d.ts" />

// Настройки приложения: пакетные запросы (песня и её этапы создаются одной транзакцией),
// адрес клиента за Caddy, ограничение частоты запросов, ежедневная резервная копия.
migrate((app) => {
  const s = app.settings();

  s.meta.appName = 'Bounce';
  const url = $os.getenv('BOUNCE_URL');
  if (url) s.meta.appURL = url;

  s.batch.enabled = true;
  s.batch.maxRequests = 100;

  // Caddy передаёт адрес клиента в X-Forwarded-For; без этого все запросы были бы "от Caddy"
  s.trustedProxy.headers = ['X-Forwarded-For'];
  s.trustedProxy.useLeftmostIP = false;
  s.rateLimits.enabled = true;

  // копия pb_data каждую ночь в pb_data/backups, хранятся 7 последних
  s.backups.cron = '0 3 * * *';
  s.backups.cronMaxKeep = 7;

  app.save(s);
});
