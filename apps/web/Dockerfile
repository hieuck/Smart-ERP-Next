FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@10.33.0
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter @smart-erp/web build
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000
CMD ["pnpm", "--filter", "@smart-erp/web", "start"]
