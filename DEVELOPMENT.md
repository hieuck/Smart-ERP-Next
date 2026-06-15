# Development

## Quick Start

```bash
# 1. Clone & start
git clone https://github.com/hieuck/Smart-ERP-Next.git
cd Smart-ERP-Next
docker compose up -d

# 2. Open browser
# http://localhost:3457
# Login: admin@demo.smarterp.vn / demo123456
```

Docker will automatically:
- Start PostgreSQL
- Build API + Web
- Run database migrations
- Seed demo data (on first run)

## Production (single container)

```bash
docker run -p 3457:3457 \
  -e DATABASE_URL=postgresql://user:pass@host/db \
  -e JWT_SECRET=your-secret \
  ghcr.io/hieuck/smart-erp-next:latest
```

## Project Structure

```
apps/api/        — NestJS backend (port 3456)
apps/web/        — Next.js frontend (port 3457)
apps/mobile/     — React Native / Expo
apps/desktop/    — Tauri 2 desktop app
packages/        — Shared libs (database, i18n, ui, utils...)
e2e/             — Playwright E2E tests
```

## Scripts

```bash
pnpm dev          # Start dev servers
pnpm test         # Run Jest unit tests
pnpm test:e2e     # Run Playwright E2E
pnpm lint         # Lint all workspaces
pnpm build        # Build all packages
```
