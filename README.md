# Smart ERP Next

**Hệ thống quản trị doanh nghiệp thế hệ mới** — ERP cho SME Việt Nam.

[![CI](https://github.com/hieuck/Smart-ERP-Next/actions/workflows/ci.yml/badge.svg)](https://github.com/hieuck/Smart-ERP-Next/actions/workflows/ci.yml)
[![Release](https://github.com/hieuck/Smart-ERP-Next/actions/workflows/release.yml/badge.svg)](https://github.com/hieuck/Smart-ERP-Next/actions/releases/latest)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://github.com/hieuck/Smart-ERP-Next/pkgs/container/smart-erp-next)
[![Tests](https://img.shields.io/badge/Tests-1,887-green)](https://github.com/hieuck/Smart-ERP-Next/actions)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue)](https://github.com/hieuck/Smart-ERP-Next/releases)

---

## Quick Start

```bash
docker run -p 3456:3456 -p 3457:3457 ghcr.io/hieuck/smart-erp-next:v1.0.0
# Web: http://localhost:3457
# API: http://localhost:3456
# Login: admin@smarterp.vn / admin123
```

Hoặc với Docker Compose:

```bash
git clone https://github.com/hieuck/Smart-ERP-Next.git
cd Smart-ERP-Next
docker compose up -d
```

Hệ thống tự động migrate DB + seed dữ liệu demo.

---

## Tính năng

| Module | Tính năng chính |
|--------|----------------|
| **POS** | Bán hàng tại quầy, thanh toán tiền mặt/chuyển khoản, quét mã vạch |
| **Bán hàng** | Đơn hàng, kênh online/pos/wholesale, e-invoice, in hóa đơn |
| **Kho** | Quản lý tồn kho, nhập/xuất, điều chuyển kho, kiểm kê, cảnh báo tồn tối thiểu |
| **Sản phẩm** | Quản lý danh mục, import Excel, in mã vạch, xuất CSV/JSON/PDF |
| **Khách hàng** | Quản lý công nợ, nhóm khách hàng, cổng thông tin khách hàng |
| **Mua hàng** | Đơn mua hàng, nhận hàng, đề xuất nhập hàng (AI) |
| **Kế toán** | Hệ thống tài khoản, bút toán, hóa đơn điện tử, dự báo dòng tiền |
| **HR** | Chấm công, tính lương, KPI, nghỉ phép, quản lý nhân viên |
| **CRM** | Quản lý lead, pipeline, deal, chiến dịch marketing |
| **Sản xuất** | BOM, MRP, lệnh sản xuất, QC, routing |
| **Báo cáo** | Dashboard, doanh thu, chi phí, dự báo AI |
| **Thiết lập** | Phân quyền, vai trò, đa tiền tệ, tích hợp e-commerce, webhooks |

---

## Kiến trúc

```
apps/
  api/          — NestJS REST API + WebSocket (58 services)
  web/          — Next.js 15 App Router (PWA-ready)
packages/
  shared/       — UI components (Button, Table, Toast, DataTable...)
  database/     — Drizzle ORM schema + PostgreSQL migrations
  hooks/        — React hooks (useNotifications, useOnlineStatus...)
  utils/        — Currency, date, number formatters
  validation/   — Zod schemas cho tất cả entities
  sync/         — Offline sync engine với IndexedDB
  accounting/   — Chart of accounts, journal entry engine
```

---

## Chất lượng

| Metric | Value |
|--------|-------|
| Tests | 1,887 (unit + integration + E2E) |
| Suites | 282 |
| Coverage | 93% stmts / 97% branches / 98% funcs / 94% lines |
| TypeScript | 0 errors (12/12 packages) |
| Lint | 0 errors |
| CI/CD | 8-step pipeline (type-check → test → lint → i18n → Playwright → migrate → E2E) |
| Docker | Multi-stage build, layer-cached, 3 service compose |

---

## Phát triển

```bash
pnpm install
pnpm dev              # Chạy API + Web đồng thời
pnpm test             # Unit + integration tests
pnpm test:e2e         # Playwright E2E tests
pnpm type-check       # TypeScript check
pnpm lint             # ESLint
scripts/ci-local.ps1  # Local CI simulation
```

Xem [DEVELOPMENT.md](DEVELOPMENT.md) và [CONTRIBUTING.md](CONTRIBUTING.md)

---

## License

MIT
