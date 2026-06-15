# Build stage: installs deps and builds all workspace packages + API
FROM node:22-alpine AS build
WORKDIR /app
ENV NODE_ENV=production
SHELL ["/bin/sh", "-o", "pipefail", "-c"]
RUN npm install -g pnpm@10.33.0 \
  && apk add --no-cache curl

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY apps/web/ ./apps/web/
COPY scripts/ ./scripts/
COPY apps/web/public/ ./apps/web/public/

RUN set -eux; \
    pnpm install --frozen-lockfile; \
    pnpm -r run build

# Runtime stage: only source + built artifacts, then clean prod install + manual workspace links
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@10.33.0 \
  && apk add --no-cache curl

COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=build /app/packages /app/packages
COPY --from=build /app/apps /app/apps
COPY --from=build /app/scripts /app/scripts

RUN set -eux; \
    pnpm install --frozen-lockfile --prod; \
    if [ -d /app/packages ]; then \
      cd /app/packages; \
      for d in */ ; do \
        name="${d%/}"; \
        target="/app/packages/${name}"; \
        link="/app/node_modules/@smart-erp/${name}"; \
        mkdir -p "$(dirname "$link")"; \
        rm -rf "$link"; \
        ln -s "$target" "$link" || cp -R "$target" "$link"; \
      done; \
    fi; \
    true

EXPOSE 3000
HEALTHCHECK CMD curl -f http://127.0.0.1:3000/health || exit 1
COPY apps/api/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh
ENTRYPOINT ["/app/docker-entrypoint.sh"]
