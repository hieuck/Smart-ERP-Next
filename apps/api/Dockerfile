FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@10.33.0
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter @smart-erp/api build
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001
CMD ["node", "apps/api/dist/apps/api/src/main.js"]
