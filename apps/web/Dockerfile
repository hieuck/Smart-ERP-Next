# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/config-typescript/package.json ./packages/config-typescript/
COPY packages/config-eslint/package.json     ./packages/config-eslint/
COPY packages/hooks/package.json             ./packages/hooks/
COPY packages/i18n/package.json              ./packages/i18n/
COPY packages/shared/package.json            ./packages/shared/
COPY packages/socket-types/package.json      ./packages/socket-types/
COPY packages/sync/package.json              ./packages/sync/
COPY packages/types/package.json             ./packages/types/
COPY packages/ui/package.json                ./packages/ui/
COPY packages/utils/package.json             ./packages/utils/
COPY packages/validation/package.json        ./packages/validation/
COPY apps/web/package.json                   ./apps/web/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# NEXT_PUBLIC_API_URL is a build-time arg for the web app
# At runtime it can be overridden via env (see docker-compose)
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm --filter @smart-erp/web build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy Next.js standalone output
COPY --from=builder --chown=appuser:appgroup /app/apps/web/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder --chown=appuser:appgroup /app/apps/web/public           ./apps/web/public

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

CMD ["node", "apps/web/server.js"]
