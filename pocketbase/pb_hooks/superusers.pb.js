/// <reference path="../pb_data/types.d.ts" />

// Суперпользователь обходит все правила и 2FA приложения, поэтому входит только напрямую к
// контейнеру (SSH-туннель, README). Запрос из интернета идёт через Caddy, а Caddy всегда
// ставит X-Forwarded-For: такой вход отклоняется - любым способом (пароль, OTP, OAuth2,
// продление) и при любом адресе коллекции (по имени _superusers или по её id).
// Caddy (deploy/bounce.caddy) отвечает 404 и раньше, но адресов у коллекции несколько.

onRecordAuthRequest((e) => {
  // заголовки в requestInfo - в нижнем регистре и с "_" вместо "-"
  if (e.requestInfo().headers['x_forwarded_for']) throw new NotFoundError();
  return e.next();
}, '_superusers');
