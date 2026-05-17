# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy workspace manifests first (better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/config-typescript/package.json ./packages/config-typescript/
COPY packages/database/package.json           ./packages/database/
COPY packages/i18n/package.json               ./packages/i18n/
COPY packages/shared/package.json             ./packages/shared/
COPY packages/socket-types/package.json       ./packages/socket-types/
COPY packages/types/package.json              ./packages/types/
COPY packages/utils/package.json              ./packages/utils/
COPY packages/validation/package.json         ./packages/validation/
COPY apps/api/package.json                    ./apps/api/

# Install all dependencies (including devDeps needed for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/config-typescript/ ./packages/config-typescript/
COPY packages/database/          ./packages/database/
COPY packages/i18n/              ./packages/i18n/
COPY packages/shared/            ./packages/shared/
COPY packages/socket-types/      ./packages/socket-types/
COPY packages/types/             ./packages/types/
COPY packages/utils/             ./packages/utils/
COPY packages/validation/        ./packages/validation/
COPY apps/api/                   ./apps/api/

# Build the API
RUN pnpm --filter @smart-erp/api build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/config-typescript/package.json ./packages/config-typescript/
COPY packages/database/package.json           ./packages/database/
COPY packages/i18n/package.json               ./packages/i18n/
COPY packages/shared/package.json             ./packages/shared/
COPY packages/socket-types/package.json       ./packages/socket-types/
COPY packages/types/package.json              ./packages/types/
COPY packages/utils/package.json              ./packages/utils/
COPY packages/validation/package.json         ./packages/validation/
COPY apps/api/package.json                    ./apps/api/

# Install production deps only
RUN pnpm install --frozen-lockfile --prod

# Copy built output from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/     ./packages/

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "apps/api/dist/main.js"]
