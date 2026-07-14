# Contributing

Cảm ơn bạn đã quan tâm đến Smart ERP Next! Dưới đây là hướng dẫn để bắt đầu.

## Quick Start

```bash
git clone https://github.com/hieuck/Smart-ERP-Next.git
cd Smart-ERP-Next
pnpm install
```

| Platform  | Command            | What it does                                      |
| --------- | ------------------ | ------------------------------------------------- |
| All       | `make dev`         | Start API + Web dev servers (hot-reload)          |
| Windows   | `dev.bat`          | Start PostgreSQL → migrate → API + Web (2 cửa sổ) |
| Mac/Linux | `scripts/dev.sh`   | Tương tự, chạy trong terminal                     |

- **API:** `http://localhost:3456` (hot-reload)
- **Web:** `http://localhost:3457` (hot-reload)

## Prerequisites

| Tool    | Version | Ghi chú                                  |
| ------- | ------- | ---------------------------------------- |
| Docker  | latest  | Cho PostgreSQL (dev.bat tự động start)    |
| pnpm    | 10.x    | Node.js package manager                  |
| Node.js | 22 LTS  | CI, Dockerfile, và local dev đều dùng 22 |

## Common Commands

```bash
make dev          # Start dev servers
make test        # Run unit + integration tests
make lint        # Lint all files
make typecheck   # TypeScript type checking
make build       # Build all packages
make ci          # Full CI pipeline locally
```

## TDD Rule: RED → GREEN

**Viết test trước, luôn luôn.**

1. **RED** — Viết test thất bại trước
2. **GREEN** — Viết code tối thiểu để pass
3. **REFACTOR** — Cải thiện code, đảm bảo test vẫn xanh

## Code Style

- **Code & commits:** English
- **Communication:** Vietnamese
- **Formatting:** Prettier (`pnpm format`)
- **No speculative code** — chỉ viết những gì cần thiết

## Quality Gates

| Gate | Command | What it checks |
|------|---------|---------------|
| Commit | `pnpm qa:commit` | lint → i18n → type-check → test → build |
| Release | `pnpm qa:release` | Commit gate + web build → native artifacts → E2E → assertion audit |

## Conventional Commits

```
feat: add sales invoice validation
fix: prevent division by zero in tax calc
test: add e2e for purchase order flow
refactor: extract currency formatter
docs: update API endpoint list
ci: speed up Docker build cache
chore: bump drizzle-orm to 0.40
```

## Branch Strategy

```
main          → Production (stable, protected)
  └── dev     → Integration (luôn xanh)
       └── feat/xxx   → Feature branches
       └── fix/xxx    → Bugfix branches
       └── refactor/  → Refactoring
```

## Running Tests

```bash
pnpm test          # Unit + integration (Jest) — 2,000+ tests
pnpm test:cov      # With coverage (threshold: 89%)
pnpm test:e2e      # E2E (Playwright) — cần DB + API + Web đang chạy
pnpm test:api:e2e  # API E2E (supertest)
pnpm qa:commit     # Full quality gate
```

## Project Structure

```
smart-erp-next/
├── apps/
│   ├── api/          # NestJS API (port 3456, ~60 services)
│   └── web/          # Next.js 15 App Router (port 3457, PWA)
├── packages/
│   ├── shared/       # UI components (Button, Table, DataTable, Toast)
│   ├── database/     # Drizzle schema (48+ tables), migrations, seed
│   ├── hooks/        # React hooks (usePagination, useDebounce, ...)
│   ├── utils/        # Formatters, sanitization, date/number utils
│   ├── validation/   # Zod validation schemas
│   ├── types/        # Shared TypeScript types
│   ├── sync/         # Offline-first sync engine (IndexedDB/CRDT)
│   ├── accounting/   # Accounting engine (Chart of Accounts, VAT)
│   ├── test-utils/   # Test data builders (buildUser, buildProduct, ...)
│   ├── config-eslint/ # Shared ESLint config
│   └── config-typescript/ # Shared TSConfig presets
├── docs/             # Technical docs, architecture, runbooks
├── e2e/              # Playwright E2E tests (22 files)
├── scripts/          # Dev/CI/build scripts (20+ scripts)
├── monitoring/       # Prometheus/Grafana/Loki config
└── .github/          # GitHub Actions (CI, release, CodeQL, Dependabot)
```

## Need Help?

Mở issue tại [github.com/hieuck/Smart-ERP-Next/issues](https://github.com/hieuck/Smart-ERP-Next/issues).
