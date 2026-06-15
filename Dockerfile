# ──────────────────────────────────────────────────────────────
# Smart ERP Next — Unified Docker Image (API + Web in one)
# Usage: docker run -p 3457:3457 ghcr.io/hieuck/smart-erp-next
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

RUN pnpm install --frozen-lockfile && pnpm -r run build

# Runtime stage
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3456
ENV WEB_PORT=3457
ENV NEXT_PUBLIC_API_URL=http://localhost:3456

RUN npm install -g pnpm@10.33.0 && apk add --no-cache curl

# Copy only built artifacts + runtime deps
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/packages/ ./packages/
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/package.json ./apps/web/
COPY --from=build /app/apps/web/public ./apps/web/public/
COPY --from=build /app/scripts/ ./scripts/
COPY --from=build /app/node_modules ./node_modules
COPY apps/api/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3456 3457
HEALTHCHECK CMD curl -f http://127.0.0.1:3456/health || exit 1
CMD ["/app/docker-entrypoint.sh"]
