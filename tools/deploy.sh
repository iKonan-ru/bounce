#!/bin/bash
# Выкладка Bounce на сервер с Docker и Caddy: код последнего коммита (git archive HEAD) в
# /opt/bounce/src, compose.yml рядом, сборка образа и перезапуск на сервере (в фоне, журнал -
# /opt/bounce/deploy.log), сайт для Caddy в /etc/caddy/sites и "docker exec caddy caddy reload --config /etc/caddy/Caddyfile".
#
#   tools/deploy.sh             выложить и дождаться ответа /api/health
#   tools/deploy.sh nowait      выложить, сборку не ждать (дальше - tools/deploy.sh status)
#   tools/deploy.sh status      ход сборки и ответ /api/health
#   tools/deploy.sh admin <логин> <пароль> [имя]
#                               главный пользователь на сервере (создать или вернуть доступ);
#                               пароль "-" - спросить без эха, а не брать из командной строки
#   tools/deploy.sh admin --reset-2fa <логин> [<пароль> | - [имя]]
#                               то же и сбросить его 2FA (потерян телефон с аутентификатором);
#                               без пароля пароль остаётся прежним
#
# Настройки - в .env (см. .env.example): DEPLOY_HOST, DEPLOY_DOMAIN; по желанию DEPLOY_SSH_KEY и
# DEPLOY_KNOWN_HOSTS (пути от корня репозитория). Команды одного запуска идут через одно
# ssh-соединение: fail2ban на сервере банит адрес за серию подключений без входа.
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a
: "${DEPLOY_HOST:?DEPLOY_HOST не задан в .env (например root@203.0.113.10)}"
: "${DEPLOY_DOMAIN:?DEPLOY_DOMAIN не задан в .env}"

ctl="$(mktemp -u /tmp/bounce-ssh.XXXXXX)"
ssh_opts=(-o BatchMode=yes -o ConnectTimeout=15 -o ControlMaster=auto -o "ControlPath=$ctl"
  -o ControlPersist=60)
key=''
if [ -n "${DEPLOY_SSH_KEY:-}" ]; then
  # ssh требует ключ с правами 0600: копия во временный файл, удаляется в конце
  key="$(mktemp)"
  cp "$DEPLOY_SSH_KEY" "$key"
  chmod 600 "$key"
  ssh_opts+=(-i "$key")
fi
if [ -n "${DEPLOY_KNOWN_HOSTS:-}" ]; then
  ssh_opts+=(-o "UserKnownHostsFile=$DEPLOY_KNOWN_HOSTS" -o StrictHostKeyChecking=yes)
fi
remote() { ssh "${ssh_opts[@]}" "$DEPLOY_HOST" "$@"; }
cleanup() {
  ssh "${ssh_opts[@]}" -O exit "$DEPLOY_HOST" 2>/dev/null || true
  [ -n "$key" ] && rm -f "$key"
}
trap cleanup EXIT

health() { curl -fsS -m 5 "https://$DEPLOY_DOMAIN/api/health" >/dev/null 2>&1; }

# последняя строка журнала сборки: DEPLOY_OK <ревизия>, DEPLOY_FAIL или ещё идёт
build_state() {
  remote 'tail -n 1 /opt/bounce/deploy.log 2>/dev/null || true'
}

wait_done() {
  local state
  for _ in $(seq 1 90); do
    state="$(build_state)"
    case "$state" in
      DEPLOY_OK*) break ;;
      DEPLOY_FAIL*)
        echo "сборка не удалась:" >&2
        remote 'tail -n 40 /opt/bounce/deploy.log' >&2
        exit 1
        ;;
    esac
    sleep 10
  done
  for _ in $(seq 1 30); do
    if health; then
      echo "готово: https://$DEPLOY_DOMAIN ($(build_state | awk '{print $2}'))"
      return 0
    fi
    sleep 2
  done
  echo "не отвечает: tools/deploy.sh status" >&2
  exit 1
}

case "${1:-}" in
  status)
    remote 'tail -n 15 /opt/bounce/deploy.log 2>/dev/null; cd /opt/bounce 2>/dev/null && docker compose ps'
    if health; then echo "https://$DEPLOY_DOMAIN отвечает"; else echo "https://$DEPLOY_DOMAIN не отвечает"; fi
    exit 0
    ;;
  admin)
    shift
    reset=''
    if [ "${1:-}" = --reset-2fa ]; then
      reset=1
      shift
    fi
    usage='tools/deploy.sh admin [--reset-2fa] <логин> [<пароль> | - [имя]]'
    { [ $# -ge 1 ] && [ $# -le 3 ]; } || { echo "$usage" >&2; exit 1; }
    login="$1" pass="${2:-}" name="${3:-}"
    # флаг не на своём месте ("admin konan --reset-2fa") стал бы логином или паролем
    for arg in "$@"; do
      case "$arg" in --*) echo "$usage" >&2; exit 1 ;; esac
    done
    # без --reset-2fa пароль обязателен; "-" - спросить его здесь, без эха и без следа в истории
    [ -n "$pass" ] || [ -n "$reset" ] || { echo "$usage" >&2; exit 1; }
    if [ "$pass" = - ]; then
      # IFS= - пробелы по краям тоже часть пароля
      IFS= read -rsp 'Пароль: ' pass
      echo >&2
      [ -n "$pass" ] || { echo 'пустой пароль' >&2; exit 1; }
    fi
    mode=''
    [ -n "$pass" ] && mode="$mode password"
    [ -n "$reset" ] && mode="$mode reset"
    # Всё - через stdin: логин, имя и режим читает shell на сервере, а пароль (последняя строка)
    # остаётся в потоке и доходит через docker compose exec до самой команды (--password-stdin).
    # В аргументах ssh, docker и pocketbase на сервере его нет.
    script='read -r u; read -r n; read -r m
      set -- --name "$n"
      case "$m" in *reset*) set -- "$@" --reset-2fa ;; esac
      case "$m" in *password*) set -- "$@" --password-stdin ;; esac
      cd /opt/bounce && docker compose exec -T bounce /pb/pocketbase bounce-admin "$u" "$@" \
        --dir /pb/pb_data --migrationsDir /pb/pb_migrations --hooksDir /pb/pb_hooks'
    printf '%s\n%s\n%s\n%s\n' "$login" "$name" "$mode" "$pass" | remote "$script"
    exit 0
    ;;
  "" | nowait) ;;
  *) echo "tools/deploy.sh [nowait | status | admin ...] - см. начало файла" >&2; exit 1 ;;
esac

if [ -n "$(git status --porcelain)" ]; then
  echo "есть незакоммиченные изменения: выкладывается только последний коммит" >&2
  git status --short >&2
  exit 1
fi

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

echo "сборка и перезапуск на сервере (в фоне; первый раз - несколько минут)"
remote "cd /opt/bounce && setsid nohup sh -c 'docker compose up -d --build --remove-orphans && docker image prune -f >/dev/null && echo DEPLOY_OK $rev || echo DEPLOY_FAIL $rev' >/opt/bounce/deploy.log 2>&1 </dev/null &"

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

if [ "${1:-}" = nowait ]; then
  echo "сборка запущена: tools/deploy.sh status"
  exit 0
fi
wait_done
