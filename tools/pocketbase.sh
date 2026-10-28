#!/bin/bash
# PocketBase для разработки: скачивает версию из pocketbase/VERSION в pocketbase/bin (со сверкой
# sha256 по checksums.txt релиза) и запускает её с данными в pocketbase/pb_data.
#
#   tools/pocketbase.sh                  serve на 127.0.0.1:8090 (Vite проксирует /api и /_)
#   tools/pocketbase.sh <команда ...>    любая команда pocketbase, например
#                                        superuser upsert admin@example.com <пароль>
set -euo pipefail

cd "$(dirname "$0")/.."
VERSION="$(tr -d '[:space:]' <pocketbase/VERSION)"
BIN="pocketbase/bin/pocketbase"

case "$(uname -s)" in
  Linux) os=linux ;;
  Darwin) os=darwin ;;
  *) echo "неизвестная ОС: $(uname -s)" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64 | amd64) arch=amd64 ;;
  arm64 | aarch64) arch=arm64 ;;
  *) echo "неизвестная архитектура: $(uname -m)" >&2; exit 1 ;;
esac

if [ ! -x "$BIN" ] || [ "$("$BIN" --version | awk '{print $3}')" != "$VERSION" ]; then
  zip="pocketbase_${VERSION}_${os}_${arch}.zip"
  base="https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}"
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  echo "скачиваю PocketBase $VERSION ($os/$arch)"
  curl -fsSL -o "$tmp/$zip" "$base/$zip"
  curl -fsSL -o "$tmp/checksums.txt" "$base/checksums.txt"
  # macOS: sha256sum нет, есть shasum
  sum=(sha256sum)
  command -v sha256sum >/dev/null || sum=(shasum -a 256)
  (cd "$tmp" && grep " $zip\$" checksums.txt | "${sum[@]}" -c --quiet -)
  mkdir -p pocketbase/bin
  unzip -o -q "$tmp/$zip" pocketbase -d pocketbase/bin
  chmod +x "$BIN"
fi

dirs=(--dir pocketbase/pb_data --migrationsDir pocketbase/pb_migrations
  --hooksDir pocketbase/pb_hooks --publicDir dist)
if [ $# -eq 0 ]; then
  exec "$BIN" serve --http 127.0.0.1:8090 "${dirs[@]}"
fi
exec "$BIN" "$@" "${dirs[@]}"
