# Bounce

Производство песен дуэта в одном месте: этапы каждой песни от наброска до мастера, тексты,
журнал находок по звуку, идеи. Приложение для телефона (PWA), сервер - PocketBase.

## Стек

| Часть      | Что                                                                           |
| ---------- | ----------------------------------------------------------------------------- |
| Интерфейс  | React 19, TypeScript (строгий), Vite 8, TanStack Router и Query               |
| Компоненты | shadcn/ui (Radix), Tailwind CSS 4, шрифт Onest                                |
| PWA        | vite-plugin-pwa: manifest, service worker, установка на главный экран         |
| Сервер     | PocketBase 0.40 (официальный бинарник): база, вход, realtime, правила доступа |
| Схема      | JS-миграции в `pocketbase/pb_migrations`, типы - `pnpm typegen`               |
| Проверки   | Biome, Vitest (в том числе правила доступа на настоящем PocketBase)           |
| Выкладка   | Docker-образ, Caddy через `/etc/caddy/sites`                    |

## Структура

```
src/
  components/      экранные компоненты; ui/ - компоненты shadcn
  lib/             PocketBase, типы, запросы, логика песен и этапов
  pages/           экраны
  router.tsx       маршруты
pocketbase/
  pb_migrations/   схема и начальные данные (шаблон этапов)
  pb_hooks/        серверные хуки (пока нет)
  VERSION          версия PocketBase для разработки и образа
tests/             тесты Vitest
deploy/            compose.yml и сайт Caddy для сервера
tools/             PocketBase для разработки, выкладка
```

## Разработка

Нужны Node.js 22+ и pnpm (`corepack enable`).

```
pnpm install
tools/pocketbase.sh superuser upsert admin@example.com <пароль>
tools/pocketbase.sh          # PocketBase на 127.0.0.1:8090, скачивается при первом запуске
pnpm dev                     # интерфейс на http://localhost:5173
```

Регистрация в приложении закрыта: участников заводит суперпользователь в админке
PocketBase (http://localhost:5173/_/, коллекция users).

- `pnpm check` - типы, Biome и тесты.
- `pnpm typegen` - типы коллекций в `src/lib/pb-types.ts` после правки схемы (нужен запущенный
  PocketBase и `.env` по образцу `.env.example`).
- Новая миграция: файл `pocketbase/pb_migrations/<unix-время>_<что>.js`, применяется при запуске
  PocketBase.

## Выкладка

Приложение живёт на сервере с Docker и Caddy: контейнер в сети
`caddy`, HTTPS выдаёт Caddy.

```
tools/deploy.sh
```

Скрипт берёт последний коммит, собирает образ на сервере (`/opt/bounce`), кладёт сайт в
`/etc/caddy/sites/bounce.caddy` и проверяет `/api/health`. Настройки - в `.env`
(`DEPLOY_HOST`, `DEPLOY_DOMAIN`).

После первой выкладки - суперпользователь на сервере, затем участники в админке `https://<домен>/_/`:

```
cd /opt/bounce && docker compose exec bounce /pb/pocketbase superuser upsert <почта> <пароль> --dir /pb/pb_data
```

Резервные копии PocketBase делает сам: каждую ночь в `/opt/bounce/pb_data/backups`, хранятся 7
последних.
