# Smart ERP Next

**Hệ thống quản trị doanh nghiệp thế hệ mới** — vượt trội ERPNext, Odoo, KiotViet, Nhanhvn, MISA về tốc độ, trải nghiệm và khả năng mở rộng.

[![CI](https://github.com/hieuck/Smart-ERP-Next/actions/workflows/ci.yml/badge.svg)](https://github.com/hieuck/Smart-ERP-Next/actions/workflows/ci.yml)
[![Release](https://github.com/hieuck/Smart-ERP-Next/actions/workflows/release.yml/badge.svg)](https://github.com/hieuck/Smart-ERP-Next/actions/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://github.com/hieuck/Smart-ERP-Next/pkgs/container/smart-erp-next)

---

## Quick Start

**Yêu cầu:** Docker & Docker Compose

### Cách 1: Nhanh nhất (dùng image có sẵn, không cần build)

```bash
docker compose -f docker-compose.quickstart.yml up -d
# Mở http://localhost:3457
# Email: admin@smarterp.vn / Mật khẩu: admin123
```

Image được tải sẵn từ GitHub Container Registry, không cần build.

> Hệ thống tự động migrate database + seed dữ liệu demo ngay lần chạy đầu tiên.

### Cách 2: Tự build (khi cần custom)

```bash
git clone https://github.com/hieuck/Smart-ERP-Next.git
cd Smart-ERP-Next
docker compose up -d
# Mở http://localhost:3457
```

Build từ source, mất ~20 phút lần đầu. Phù hợp khi bạn muốn chỉnh sửa code.

---

## Modules

| Module | Trạng thái |
|--------|------------|
| Dashboard, POS, Orders | Hoàn chỉnh |
| Products, Inventory, Customers | Hoàn chỉnh |
| Suppliers, Purchasing, Payments | Hoàn chỉnh |
| Accounting, HR, Payroll | Hoàn chỉnh |
| CRM, E-Invoice, Manufacturing | Hoàn chỉnh |
| Analytics, Chat, Settings | Hoàn chỉnh |
| Quality (QMS), MRP, Projects | Hoàn chỉnh |
| Fixed Assets, Warehouses | Hoàn chỉnh |
| Approvals, Automation, Reports | Hoàn chỉnh |
| E-commerce sync, AI Copilot | Hoàn chỉnh |

---

## Kiến trúc

```
apps/
  api/          — NestJS REST API + WebSocket
  web/          — Next.js App Router (PWA)
packages/
  shared/       — UI components (Button, Table, Toast...)
  hooks/        — React hooks (useNotifications, useLocalStorage...)
  database/     — Drizzle ORM schema + migrations
  utils/        — Shared utilities
  validation/   — Zod schemas
  types/        — TypeScript types
  sync/         — Offline sync engine
  accounting/   — Accounting engine
```

---

## Phát triển

Xem [DEVELOPMENT.md](DEVELOPMENT.md)

## License

MIT
