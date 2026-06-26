# ─── Smart ERP Next — Self-contained Docker Image ─────────────
# Postgres + API + Web in one container for zero-config demo
# Usage: docker run -p 3456:3456 -p 3457:3457 ghcr.io/hieuck/smart-erp-next
# ──────────────────────────────────────────────────────────────

# Build stage
FROM node:22-alpine AS build
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@10.33.0 && apk add --no-cache curl

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
COPY apps/api/ ./apps/api/
COPY scripts/ ./scripts/
COPY apps/web/public/ ./apps/web/public/

RUN pnpm install --no-frozen-lockfile && pnpm -r run build

# Runtime stage — based on postgres for embedded database
FROM postgres:16-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3456
ENV WEB_PORT=3457
ENV NEXT_PUBLIC_API_URL=http://localhost:3456

LABEL org.opencontainers.image.title="Smart ERP Next"
LABEL org.opencontainers.image.description="Smart ERP Next - POS, Kho, CRM, Ke toan, HR"
LABEL org.opencontainers.image.source="https://github.com/hieuck/Smart-ERP-Next"
LABEL org.opencontainers.image.licenses="MIT"

# Install Node.js + curl (no pnpm — use node_modules from build stage)
RUN apk add --no-cache nodejs curl

# Copy only built artifacts and config files (not TypeScript source)
COPY --from=build /app/packages /app/packages
COPY --from=build /app/apps/api/dist /app/apps/api/dist
COPY --from=build /app/apps/web/.next /app/apps/web/.next
COPY --from=build /app/apps/web/public /app/apps/web/public
COPY --from=build /app/apps/web/package.json /app/apps/web/package.json
COPY --from=build /app/apps/web/next.config.mjs /app/apps/web/next.config.mjs
COPY --from=build /app/apps/api/package.json /app/apps/api/package.json
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/scripts /app/scripts
COPY apps/api/docker-entrypoint.sh /app/docker-entrypoint.sh

# Copy node_modules from build stage (already contains all production deps)
COPY --from=build /app/node_modules /app/node_modules

# Remove TypeScript source from packages, remove pnpm, create workspace symlinks
RUN set -eux; \
    rm -rf /app/apps/web/src /app/apps/api/src; \
    for d in /app/packages/*/; do \
      rm -rf "${d}src" "${d}__tests__" 2>/dev/null || true; \
    done; \
    find /app/packages -type f \( -name '*.ts' -o -name '*.map' -o -name 'tsconfig*' \) -not -path '*/node_modules/*' -delete; \
    rm -f /usr/local/bin/pnpm /usr/local/lib/node_modules/pnpm; \
    for d in /app/packages/*/; do \
      name="$(basename "$d")"; \
      link="/app/node_modules/@smart-erp/${name}"; \
      mkdir -p "$(dirname "$link")"; \
      rm -rf "$link"; \
      ln -sf "$d" "$link"; \
    done; \
    chmod +x /app/docker-entrypoint.sh

EXPOSE 3456 3457
HEALTHCHECK CMD curl -f http://127.0.0.1:3456/health || exit 1
CMD ["/app/docker-entrypoint.sh"]
