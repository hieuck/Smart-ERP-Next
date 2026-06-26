# ──────────────────────────────────────────────────────────────
# Smart ERP Next — Self-contained Docker Image
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
LABEL org.opencontainers.image.description="Hệ thống quản trị doanh nghiệp toàn diện: POS, Kho, CRM, Kế toán, HR"
LABEL org.opencontainers.image.source="https://github.com/hieuck/Smart-ERP-Next"
LABEL org.opencontainers.image.licenses="MIT"

# Install Node.js + pnpm + curl
RUN apk add --no-cache nodejs npm curl && \
    npm install -g pnpm@10.33.0

# Copy built artifacts
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/packages /app/packages
COPY --from=build /app/apps /app/apps
COPY --from=build /app/scripts /app/scripts
COPY apps/api/docker-entrypoint.sh /app/docker-entrypoint.sh

# Production install
RUN set -eux; \
    pnpm install --no-frozen-lockfile --prod; \
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
