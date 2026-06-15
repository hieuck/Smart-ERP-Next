# Development

## Quick Start — 2 cách

### Cách 1: Docker (không cần setup)

```bash
git clone https://github.com/hieuck/Smart-ERP-Next.git
cd Smart-ERP-Next
docker compose up -d
# → http://localhost:3457
```

### Cách 2: Local dev (nhanh, hot-reload)

**Windows:**
```bash
dev.bat
```

**Mac/Linux:**
```bash
./scripts/dev.sh
```

```bash
git clone https://github.com/hieuck/Smart-ERP-Next.git
cd Smart-ERP-Next
./scripts/dev.sh
# → API: http://localhost:3456 (hot-reload)
# → Web: http://localhost:3457 (hot-reload)
```

`dev.sh` tự động:
- Tạo `.env` từ `.env.example` nếu chưa có
- Start PostgreSQL (Docker) nếu chưa chạy
- Chạy database migrations
- Start API + Web với Turbo (hot-reload)

## Demo Data

```bash
# Reset DB and seed demo data
./scripts/reset-dev.sh

# After seeding:
# Login: admin@demo.smarterp.vn / demo123456
```

Or register a new account at `/register` — works immediately.

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

## Maintenance

```bash
./scripts/health-check.sh   # Check all services
./scripts/reset-dev.sh       # Reset DB + re-seed
./scripts/backup.sh          # Backup database
```
