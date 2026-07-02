# ─── Smart ERP Next — Self-contained Docker Image ─────────────
# Postgres + API + Web in one container for zero-config demo
# Usage: docker run -p 3456:3456 -p 3457:3457 ghcr.io/hieuck/smart-erp-next
# ──────────────────────────────────────────────────────────────

# Build stage — optimized for Docker layer caching
ARG CACHEBUST
FROM node:26-alpine AS build
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache curl && npm install -g pnpm@10.33.0

# Step 1: Copy only package manifests (rarely change → cached install)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/utils/package.json packages/utils/package.json
COPY packages/validation/package.json packages/validation/package.json
COPY packages/hooks/package.json packages/hooks/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/sync/package.json packages/sync/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/accounting/package.json packages/accounting/package.json
COPY packages/test-utils/package.json packages/test-utils/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

# Step 2: Copy source (before install — avoids Docker overlayfs symlink issues)
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY scripts/ ./scripts/
COPY apps/web/public/ ./apps/web/public/

# Step 3: Install deps (cached unless package.json or source changes)
RUN npm_config_node_linker=hoisted pnpm install --frozen-lockfile --ignore-scripts --shamefully-hoist

# Step 4: Build (use node_modules/.bin/tsc directly — hoisted linker)
RUN node node_modules/.bin/tsc -p packages/database/tsconfig.json && \
    node node_modules/.bin/tsc -p packages/accounting/tsconfig.json && \
    node node_modules/.bin/tsc -p packages/shared/tsconfig.json && \
    node node_modules/.bin/tsc -p packages/utils/tsconfig.build.json && \
    node node_modules/.bin/tsc -p packages/hooks/tsconfig.build.json && \
    node node_modules/.bin/tsc -p packages/validation/tsconfig.json && \
    node node_modules/.bin/tsc -p packages/types/tsconfig.json && \
    cd apps/api && node ../../node_modules/.bin/tsc -p tsconfig.json && \
    node -e "require('fs').cpSync('src/i18n/locales', '../../apps/api/dist/apps/api/src/i18n/locales', {recursive: true, force: true})"

# Step 5: Build Next.js web app
RUN echo "Cache bust: ${CACHEBUST:-none}" && cd apps/web && rm -rf .next/cache .next/server && node ../../node_modules/.bin/next build

# Runtime stage — based on postgres for embedded database
FROM postgres:18-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3456
ENV WEB_PORT=3457
ENV NEXT_PUBLIC_API_URL=http://localhost:3456

# Install Node.js + curl (no pnpm — use node_modules from build stage)
RUN apk add --no-cache nodejs curl

# Copy complete node_modules (hoisted, no symlinks) and built artifacts
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/packages /app/packages
COPY --from=build /app/apps/api/dist /app/apps/api/dist
COPY --from=build /app/apps/api/package.json /app/apps/api/package.json
COPY --from=build /app/apps/web/.next /app/apps/web/.next
COPY --from=build /app/apps/web/.next/static /app/apps/web/.next/standalone/apps/web/.next/static
COPY --from=build /app/apps/web/public /app/apps/web/.next/standalone/apps/web/public
COPY --from=build /app/apps/web/package.json /app/apps/web/package.json
COPY --from=build /app/apps/web/next.config.mjs /app/apps/web/next.config.mjs
COPY --from=build /app/scripts /app/scripts
COPY apps/api/docker-entrypoint.sh /app/docker-entrypoint.sh

# Try pnpm rebuild to fix workspace symlinks; if pnpm unavailable, manually link
RUN npm_config_node_linker=hoisted pnpm rebuild --shamefully-hoist 2>/dev/null || \
    (mkdir -p /app/node_modules/@smart-erp && \
     for d in /app/packages/*/; do \
       name=$(basename "$d"); \
       ln -sfn "$d" "/app/node_modules/@smart-erp/$name" 2>/dev/null || true; \
     done); \
    rm -rf /app/apps/web/src /app/apps/web/.next/cache /app/apps/api/src /app/packages/*/__tests__; \
    find /app/packages -type f \( -name '*.map' -o -name 'tsconfig*' \) -not -path '*/node_modules/*' -not -name 'drizzle.config.ts' -delete; \
    rm -f /usr/local/bin/pnpm /usr/local/lib/node_modules/pnpm; \
    rm -rf /root/.pnpm-store /root/.npm /tmp/* /var/cache/apk/*; \
    find /app/node_modules -name "*.d.ts" -delete 2>/dev/null; \
    find /app/node_modules -name "*.md" -delete 2>/dev/null; \
    chmod +x /app/docker-entrypoint.sh

LABEL org.opencontainers.image.title="Smart ERP Next" \
      org.opencontainers.image.description="ERP system for Vietnamese SMEs — POS, inventory, accounting, manufacturing, CRM" \
      org.opencontainers.image.url="https://github.com/hieuck/Smart-ERP-Next" \
      org.opencontainers.image.source="https://github.com/hieuck/Smart-ERP-Next" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="${VERSION:-latest}"

EXPOSE 3456 3457
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f -H "X-API-Version: 1" http://127.0.0.1:3456/health || exit 1
CMD ["/app/docker-entrypoint.sh"]
