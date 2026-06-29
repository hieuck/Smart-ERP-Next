# ─── Smart ERP Next — Self-contained Docker Image ─────────────
# Postgres + API + Web in one container for zero-config demo
# Usage: docker run -p 3456:3456 -p 3457:3457 ghcr.io/hieuck/smart-erp-next
# ──────────────────────────────────────────────────────────────

# Build stage — optimized for Docker layer caching
FROM node:22-alpine AS build
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@10.33.0 && apk add --no-cache curl

# Step 1: Copy only package manifests (rarely change → cached install)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/utils/package.json packages/utils/package.json
COPY packages/validation/package.json packages/validation/package.json
COPY packages/hooks/package.json packages/hooks/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/sync/package.json packages/sync/package.json
COPY packages/accounting/package.json packages/accounting/package.json
COPY packages/config-eslint/package.json packages/config-eslint/package.json
COPY packages/config-typescript/package.json packages/config-typescript/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

# Step 2: Install deps (cached unless any package.json changes)
# npm_config_node_linker=hoisted ensures flat node_modules without symlinks
# This is REQUIRED for Docker multi-stage: symlinks break when COPYing between stages
RUN npm_config_node_linker=hoisted pnpm install --no-frozen-lockfile --ignore-scripts

# Step 3: Copy source code (frequently changes, but install is cached)
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY scripts/ ./scripts/
COPY apps/web/public/ ./apps/web/public/

# Step 4: Build
RUN pnpm -r run build

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

# Copy TypeScript source files needed by compiled JS (tsconfig paths)
COPY packages/accounting/src ./packages/accounting/src
COPY packages/database/src ./packages/database/src
COPY packages/shared/src ./packages/shared/src
COPY packages/hooks/src ./packages/hooks/src
COPY packages/utils/src ./packages/utils/src
COPY packages/validation/src ./packages/validation/src
COPY packages/sync/src ./packages/sync/src
COPY packages/types/src ./packages/types/src

# Create workspace symlinks, remove pnpm
RUN set -eux; \
    rm -rf /app/apps/web/src /app/apps/api/src /app/packages/*/__tests__; \
    find /app/packages -type f \( -name '*.map' -o -name 'tsconfig*' \) -not -path '*/node_modules/*' -not -name 'drizzle.config.ts' -delete; \
    rm -f /usr/local/bin/pnpm /usr/local/lib/node_modules/pnpm; \
    # Fix compiled JS path resolution: TypeScript emits relative paths
    # from source location, but compiled output is in dist/ subdirectory.
    # Remove real accounting/database dirs (build artifacts), replace packages
    # symlink to point to /app/packages for correct resolution.
    rm -rf /app/apps/api/dist/packages/accounting /app/apps/api/dist/packages/database; \
    ln -sfn /app/packages /app/apps/api/dist/packages; \
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
