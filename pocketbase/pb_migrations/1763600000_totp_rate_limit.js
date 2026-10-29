/// <reference path="../pb_data/types.d.ts" />

// Ограничение частоты для подключения 2FA: /api/bounce/totp/setup и /enable (pb_hooks/totp.pb.js)
// вместе - 10 запросов в минуту с одного адреса. Общее правило PocketBase для /api/ пропускает 300
// запросов за 10 секунд: столько не нужно человеку, а перебору кодов подтверждения и выпуску
// ключей - на руку. Адрес клиента PocketBase берёт из X-Forwarded-For от Caddy
// (1762000000_bounce.js).

/** Метка правила: префикс адресов подключения 2FA */
const TOTP_LIMIT_LABEL = '/api/bounce/totp/';

/** Настройки и правила ограничения частоты без правила для 2FA */
function getRulesWithoutTotpLimit(app) {
  const settings = app.settings();
  const rules = [];
  for (const rule of settings.rateLimits.rules) {
    if (rule.label !== TOTP_LIMIT_LABEL) {
      rules.push(rule);
    }
  }

  return { settings, rules };
}

migrate(
  (app) => {
    const { settings, rules } = getRulesWithoutTotpLimit(app);
    // в начало списка: из правил-префиксов PocketBase берёт первое подходящее по порядку, и
    // общее "/api/", стоящее раньше, перехватило бы эти запросы
    settings.rateLimits.rules = [
      { label: TOTP_LIMIT_LABEL, audience: '', duration: 60, maxRequests: 10 },
      ...rules,
    ];
    app.save(settings);
  },
  (app) => {
    const { settings, rules } = getRulesWithoutTotpLimit(app);
    settings.rateLimits.rules = rules;
    app.save(settings);
  }
);
