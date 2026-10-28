# Bounce: PocketBase с приложением в pb_public. Сборка: интерфейс (pnpm build), затем официальный
# бинарник PocketBase версии из pocketbase/VERSION со сверкой sha256. Базовые образы - с зеркала
# mirror.gcr.io: Docker Hub из РФ бывает недоступен или режет частоту запросов.
ARG REGISTRY=mirror.gcr.io/library

FROM ${REGISTRY}/node:22-alpine AS web
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM ${REGISTRY}/alpine:3.22 AS pocketbase
ARG TARGETARCH
COPY pocketbase/VERSION /tmp/VERSION
RUN set -eu; \
    v="$(tr -d '[:space:]' </tmp/VERSION)"; \
    zip="pocketbase_${v}_linux_${TARGETARCH:-amd64}.zip"; \
    base="https://github.com/pocketbase/pocketbase/releases/download/v${v}"; \
    cd /tmp; \
    wget -q "$base/$zip" "$base/checksums.txt"; \
    grep " $zip\$" checksums.txt | sha256sum -c -; \
    unzip -q "$zip" pocketbase

FROM ${REGISTRY}/alpine:3.22
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 1000 bounce
WORKDIR /pb
COPY --from=pocketbase /tmp/pocketbase /pb/pocketbase
COPY pocketbase/pb_migrations /pb/pb_migrations
COPY pocketbase/pb_hooks /pb/pb_hooks
COPY --from=web /app/dist /pb/pb_public
# каталог данных - пользователя bounce: том при первом запуске наследует владельца
RUN mkdir -p /pb/pb_data && chown bounce:bounce /pb/pb_data
USER bounce
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8090/api/health >/dev/null || exit 1
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", \
     "--publicDir=/pb/pb_public", "--migrationsDir=/pb/pb_migrations", "--hooksDir=/pb/pb_hooks"]
