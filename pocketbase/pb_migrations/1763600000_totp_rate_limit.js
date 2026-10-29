/// <reference path="../pb_data/types.d.ts" />

// Ограничение частоты для подключения 2FA: /api/bounce/totp/setup и /enable (pb_hooks/totp.pb.js)
// вместе - 10 запросов в минуту с одного адреса. Общее правило PocketBase для /api/ пропускает 300
// запросов за 10 секунд: столько не нужно человеку, а перебору кодов подтверждения и выпуску
// ключей - на руку. Адрес клиента PocketBase берёт из X-Forwarded-For от Caddy
// (1762000000_bounce.js).

const LABEL = '/api/bounce/totp/';

function without(app) {
  const s = app.settings();
  const rules = [];
  for (const r of s.rateLimits.rules) {
    if (r.label !== LABEL) rules.push(r);
  }
  return { s, rules };
}

migrate(
  (app) => {
    const { s, rules } = without(app);
    // в начало списка: из правил-префиксов PocketBase берёт первое подходящее по порядку, и
    // общее "/api/", стоящее раньше, перехватило бы эти запросы
    s.rateLimits.rules = [{ label: LABEL, audience: '', duration: 60, maxRequests: 10 }, ...rules];
    app.save(s);
  },
  (app) => {
    const { s, rules } = without(app);
    s.rateLimits.rules = rules;
    app.save(s);
  },
);
