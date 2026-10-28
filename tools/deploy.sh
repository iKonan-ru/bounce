#!/bin/bash
# Выкладка Bounce на сервер с Docker и Caddy: код последнего коммита (git archive HEAD) в
# /opt/bounce/src, compose.yml рядом, сборка образа и перезапуск на сервере, сайт для Caddy
# панели в /etc/caddy/sites и "docker exec caddy caddy reload --config /etc/caddy/Caddyfile".
#
# Настройки - в .env (см. .env.example): DEPLOY_HOST, DEPLOY_DOMAIN; по желанию DEPLOY_SSH_KEY и
# DEPLOY_KNOWN_HOSTS. Все команды идут через одно ssh-соединение: fail2ban на сервере банит адрес
# за серию подключений без входа.
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a
: "${DEPLOY_HOST:?DEPLOY_HOST не задан в .env (например root@203.0.113.10)}"
: "${DEPLOY_DOMAIN:?DEPLOY_DOMAIN не задан в .env}"

if [ -n "$(git status --porcelain)" ]; then
  echo "есть незакоммиченные изменения: выкладывается только последний коммит" >&2
  git status --short >&2
  exit 1
fi

ctl="$(mktemp -u /tmp/bounce-ssh.XXXXXX)"
ssh_opts=(-o BatchMode=yes -o ControlMaster=auto -o "ControlPath=$ctl" -o ControlPersist=60)
[ -n "${DEPLOY_SSH_KEY:-}" ] && ssh_opts+=(-i "$DEPLOY_SSH_KEY")
if [ -n "${DEPLOY_KNOWN_HOSTS:-}" ]; then
  ssh_opts+=(-o "UserKnownHostsFile=$DEPLOY_KNOWN_HOSTS" -o StrictHostKeyChecking=yes)
fi
remote() { ssh "${ssh_opts[@]}" "$DEPLOY_HOST" "$@"; }
trap 'ssh "${ssh_opts[@]}" -O exit "$DEPLOY_HOST" 2>/dev/null || true' EXIT

rev="$(git rev-parse --short HEAD)"
echo "выкладка $rev на $DEPLOY_HOST ($DEPLOY_DOMAIN)"

remote 'test -d /etc/caddy/sites' || {
  echo "на сервере нет /etc/caddy/sites: нужна папка сайтов Caddy" >&2
  exit 1
}

git archive --format=tar HEAD | remote 'set -e
  mkdir -p /opt/bounce/pb_data
  chown 1000:1000 /opt/bounce/pb_data
  rm -rf /opt/bounce/src.new
  mkdir /opt/bounce/src.new
  tar -x -C /opt/bounce/src.new
  rm -rf /opt/bounce/src
  mv /opt/bounce/src.new /opt/bounce/src
  install -m 644 /opt/bounce/src/deploy/compose.yml /opt/bounce/compose.yml'

remote "printf 'BOUNCE_DOMAIN=%s\nBOUNCE_REV=%s\n' '$DEPLOY_DOMAIN' '$rev' >/opt/bounce/.env"

echo "сборка и перезапуск (первый раз - несколько минут)"
remote 'cd /opt/bounce && docker compose up -d --build --remove-orphans && docker image prune -f >/dev/null'

echo "сайт для Caddy"
sed "s|__DOMAIN__|$DEPLOY_DOMAIN|" deploy/bounce.caddy | remote 'set -e
  cat >/etc/caddy/sites/bounce.caddy.new
  if cmp -s /etc/caddy/sites/bounce.caddy.new /etc/caddy/sites/bounce.caddy; then
    rm /etc/caddy/sites/bounce.caddy.new
    echo "без изменений"
  else
    mv /etc/caddy/sites/bounce.caddy.new /etc/caddy/sites/bounce.caddy
    docker exec caddy caddy reload --config /etc/caddy/Caddyfile
  fi'

echo "проверка https://$DEPLOY_DOMAIN/api/health"
for _ in $(seq 1 30); do
  if curl -fsS -m 5 "https://$DEPLOY_DOMAIN/api/health" >/dev/null 2>&1; then
    echo "готово: https://$DEPLOY_DOMAIN ($rev)"
    exit 0
  fi
  sleep 2
done
echo "за минуту не ответил: ssh $DEPLOY_HOST 'cd /opt/bounce && docker compose logs --tail 50'" >&2
exit 1
