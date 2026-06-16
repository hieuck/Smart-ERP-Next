# Smart ERP Next

**Hệ thống quản trị doanh nghiệp thế hệ mới** — vượt trội ERPNext, Odoo, KiotViet, Nhanhvn, MISA về tốc độ, trải nghiệm và khả năng mở rộng.

[![CI](https://github.com/hieuck/Smart-ERP-Next/actions/workflows/ci.yml/badge.svg)](https://github.com/hieuck/Smart-ERP-Next/actions/workflows/ci.yml)
[![Release](https://github.com/hieuck/Smart-ERP-Next/actions/workflows/release.yml/badge.svg)](https://github.com/hieuck/Smart-ERP-Next/actions/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://github.com/hieuck/Smart-ERP-Next/pkgs/container/smart-erp-next)

---

## 🚀 Quick Start

**Yêu cầu:** Docker & Docker Compose

```bash
# 1. Clone & chạy — không cần .env, không cần cài đặt gì thêm
git clone https://github.com/hieuck/Smart-ERP-Next.git
cd Smart-ERP-Next
docker compose up -d

# 2. Mở trình duyệt
# Web: http://localhost:3457
# API: http://localhost:3456/api

# 3. Đăng nhập
# Email:    admin@smarterp.vn
# Mật khẩu: admin123
```

> Hệ thống tự động migrate database + seed dữ liệu demo ngay lần chạy đầu tiên.

### Dùng image từ GitHub Container Registry:

**Bước 1:** Pull image
```bash
docker pull ghcr.io/hieuck/smart-erp-next:latest
```

**Bước 2:** Chạy PostgreSQL (nếu chưa có)
```bash
docker run -d --name smart-erp-postgres \
  -e POSTGRES_USER=smart_erp -e POSTGRES_PASSWORD=smart_erp -e POSTGRES_DB=smart_erp \
  -v smart_erp_data:/var/lib/postgresql/data \
  postgres:16-alpine
```

**Bước 3:** Chạy Smart ERP
```bash
docker run -d --name smart-erp -p 3457:3457 -p 3456:3456 \
  -e DATABASE_URL=postgresql://smart_erp:smart_erp@host.docker.internal:5432/smart_erp \
  ghcr.io/hieuck/smart-erp-next:latest
```

> Xem packages: https://github.com/hieuck/Smart-ERP-Next/pkgs/container/smart-erp-next
```

### Xóa toàn bộ dữ liệu & reset:
```bash
docker compose down -v && docker compose up -d
```

---

## Tính năng

| Tính năng                |    Smart ERP Next     | KiotViet | Nhanhvn | MISA | ERPNext |
| ------------------------ | :-------------------: | :------: | :-----: | :--: | :-----: |
| Native đa nền tảng       | ✅ Web+Mobile+Desktop |    ❌    |   ❌    |  ❌  |   ❌    |
| Offline-first + CRDT     |          ✅           |    ❌    |   ❌    |  ❌  |   ❌    |
| Mã nguồn mở              |          ✅           |    ❌    |   ❌    |  ❌  |   ✅    |
| Bản địa hóa vi/en        |      ✅ Built-in      |    ✅    |   ✅    |  ✅  | Partial |
| Multi-tenant             |          ✅           |    ❌    |   ❌    |  ❌  |   ✅    |
| Real-time WebSocket      |          ✅           | Partial  | Partial |  ❌  |   ❌    |
| POS tích hợp             |          ✅           |    ✅    |   ✅    |  ❌  |   ✅    |
| Monorepo shared packages |          ✅           |    ❌    |   ❌    |  ❌  |   ❌    |
| Lot tracking + Expiry    |          ✅           |    ❌    |   ❌    |  ❌  |   ❌    |
| Multi-warehouse transfer |          ✅           |    ❌    |   ❌    |  ❌  |   ❌    |
| AI Business Intelligence | ✅ Predictive Stock   |    ❌    |   ❌    |  ❌  | Partial |
| Omnichannel Hub          | ✅ Shopee/TikTok/Amazon/eBay | Partial  | ✅       |  ❌  | Partial |
| HR/Payroll               | ✅ Full Module        |    ❌    |   ❌    |  ✅  |   ✅    |
| Loyalty Program          | ✅ Points/Tiers/Rewards|   ❌    |   ✅    |  ❌  |   ❌    |
| Fixed Assets             | ✅ Depreciation       |    ❌    |   ❌    |  ✅  |   ✅    |
| Project Management       | ✅ Tasks/Milestones   |    ❌    |   ❌    |  ❌  |   ✅    |
| E-Invoice (HĐ điện tử)  | ✅ VNPT/Viettel/MISA  |  Addon   |  Addon  |  ✅  | Partial |

---

## Tính năng nổi bật

### 🧠 AI-Powered Business Intelligence
- **Dự báo nhu cầu (Demand Forecasting)**: Sử dụng lịch sử bán hàng thực tế để dự báo tồn kho cần thiết.
- **Gợi ý nhập hàng tự động**: Tính toán số lượng đặt hàng tối ưu dựa trên tốc độ bán và lead time.
- **Inventory Recommendation Service**: AI‑driven reorder suggestions via `/inventory-recommendation/suggest` endpoint.
- **Forecast Dashboard**: Visual demand forecast UI with i18n support.

### 🌐 E-commerce Integration Hub (Omnichannel)
- **Đồng bộ đa sàn**: Kết nối Shopee, Lazada, TikTok Shop, Amazon, eBay, Shopify.
- **Chống bán quá đà (Oversell Protection)**: Cơ chế giữ hàng (reservation) ngay khi có đơn từ sàn.
- **Tồn kho khả dụng thông minh**: Tự động trừ safety buffer trước khi đẩy số lượng lên marketplace.
- **Real-time Sync Logs**: Theo dõi chi tiết từng lần đồng bộ dữ liệu.

## Cấu hình nâng cao

### Biến môi trường (tùy chọn, có sẵn giá trị mặc định)

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `DB_USER` | `smart_erp` | User PostgreSQL |
| `DB_PASSWORD` | `smart_erp` | Password PostgreSQL |
| `JWT_SECRET` | `dev-secret-...` | Secret cho JWT token |
| `API_PORT` | `3456` | Cổng API |
| `WEB_PORT` | `3457` | Cổng Web |

Ghi đè bằng file `.env` hoặc biến môi trường:
```bash
JWT_SECRET=my-secret docker compose up -d
```

---

## Offline‑First & Real‑Time
- **Real‑time activity notifications** via WebSockets (tenant‑scoped)
- **Real‑time approval requests** – approvers get instant notifications and can approve/reject directly from the web UI
- **Sync status indicator** with pending changes count and manual/auto retry
- **Conflict resolution** UI for offline edits (powered by Dexie + background sync)

---

## 🧪 Test Coverage & Quality Assurance

### Current Status
- **API Tests**: 435 tests passing ✅ (120 test suites)
- **Web Tests**: 9 test files (expanding coverage)
- **Package Tests**: 28 test files
- **E2E Tests**: 3 test files (in development)

### Test Strategy
- **Unit Tests**: Service layer, utilities, hooks
- **Integration Tests**: API endpoints, database queries
- **E2E Tests**: Critical user flows (auth, orders, inventory)
- **Coverage Target**: 70%+ across all packages

### Running Tests
```bash
# Run all tests
pnpm test

# Run tests for specific app
pnpm test -- apps/api

# Run with coverage report
pnpm test:cov

# Watch mode
pnpm test -- --watch
```

### Quality Gates
- Pre-commit: Lint + type check
- Pre-push: All tests must pass
- Release: 70%+ coverage required

## Tech Stack

| Thành phần   | Công nghệ                               |
| ------------ | --------------------------------------- |
| Monorepo     | pnpm 9 + Turborepo 2                    |
| Backend API  | NestJS 10, Drizzle ORM, PostgreSQL 14+  |
| Web App      | Next.js 15, React 19, Tailwind CSS 3    |
| Mobile       | Expo 52, React Native 0.76, SecureStore |
| Desktop      | Tauri 2 (Rust + WebView)                |
| Docs         | Docusaurus 3 (vi/en)                    |
| i18n         | i18next — vi mặc định, en hỗ trợ        |
| Validation   | Zod (frontend) + class-validator (API)  |
| Offline Sync | Dexie (IndexedDB) + CRDT vector clocks  |
| Real-time    | Socket.IO 4                             |

---

## 🌍 Internationalization

The application is fully internationalized with support for:
- **Vietnamese (vi)** – default language
- **English (en)**

All user‑facing text uses i18n keys from the `@smart-erp/i18n` package. To add translations, edit the JSON files in `packages/i18n/src/locales/`.

---

## Cấu trúc dự án

```
smart-erp-next/
├── apps/
│   ├── api/          # NestJS backend — 15+ modules
│   ├── web/          # Next.js 15 dashboard
│   ├── mobile/       # React Native (Expo)
│   ├── desktop/      # Tauri 2
│   └── docs/         # Docusaurus 3
├── packages/
│   ├── database/     # Drizzle ORM schemas + migrations
│   ├── i18n/         # i18next vi/en
│   ├── types/        # Shared TS types
│   ├── shared/       # Platform/localization/competitive contracts
│   ├── validation/   # Zod schemas
│   ├── sync/         # Offline sync + CRDT
│   ├── ui/           # Shared React UI kit
│   ├── hooks/        # Shared hooks
│   └── utils/        # Pure TS utilities
├── docs/
│   └── guides/
│       └── forecast-locator.md
└── PRODUCTION_CHECKLIST.md
```

---

## Modules (API + Web)

| Module         | API | Web | Mobile | Desktop |
| -------------- | :-: | :-: | :----: | :-----: |
| Dashboard      | ✅  | ✅  |   ✅   |   ✅    |
| POS (Bán hàng) | ✅  | ✅  |   ✅   |   ✅    |
| Đơn hàng       | ✅  | ✅  |   ✅   |   ✅    |
| Sản phẩm       | ✅  | ✅  |   ✅   |   ✅    |
| Kho hàng       | ✅  | ✅  |   ✅   |   ✅    |
| Khách hàng     | ✅  | ✅  |   ✅   |   ✅    |
| Nhà cung cấp   | ✅  | ✅  |   ✅   |   🔜    |
| Mua hàng       | ✅  | ✅  |   ✅   |   🔜    |
| Thu chi        | ✅  | ✅  |   🔜   |   🔜    |
| Quản lý kho    | ✅  | ✅  |   🔜   |   🔜    |
| Lô hàng (Lot) | ✅  | ✅  |   🔜   |   🔜    |
| Chuyển kho     | ✅  | ✅  |   🔜   |   🔜    |
| Người dùng     | ✅  | ✅  |   🔜   |   🔜    |
| Báo cáo        | ✅  | ✅  |   ✅   |   🔜    |
| Cài đặt        |  —  | ✅  |   🔜   |   🔜    |
| **HR/Payroll** | ✅  | ✅  |   ✅   |   ✅    |
| **Loyalty**    | ✅  | ✅  |   ✅   |   🔜    |
| **Fixed Assets**| ✅  | ✅  |   ✅   |   🔜    |
| **Projects**   | ✅  | ✅  |   ✅   |   🔜    |
| **Quản lý Sản xuất (MRP)**| ✅  | ❌  |   ✅   |   ✅    |
| **Quản lý Chất lượng**    | ✅  | ❌  |   ❌   |   🔜    |
| **CRM (Sales Pipeline)**  | ✅  | ✅  |   ✅   |   ✅    |
| **Đa kênh (Omnichannel)** | ✅  | ✅  |   ✅   |   ✅    |
| **Hóa đơn điện tử**| ✅  | ✅  |   ✅   |   🔜    |
| **Hợp đồng Điện tử (E-Contract)**| ✅  | ❌  |   ✅   |   ✅    |
| **Chấm công (HR)**  | ✅  | 🔜  |   🔜   |   🔜    |
| **Tính lương (Payroll)**| ✅  | ❌  |   ✅   |   ✅    |
| **Helpdesk**   | ✅  | ✅  |   ✅   |   🔜    |
| **AI Forecast**| ✅  | ✅  |   ✅   |   ✅    |

---

## Docker

### Chạy AI Forecasting Service

```bash
# Chạy Python AI service (Prophet ML)
docker-compose up -d ai-forecast

# Kiểm tra health
curl http://localhost:8000/health

# Xem logs
docker-compose logs -f ai-forecast
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_FORECAST_PORT` | 8000 | AI service port |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `JWT_SECRET` | - | JWT signing secret |

---

```
tenants
  ├── users (roles: admin/manager/accountant/warehouse/sales/user)
  ├── products → product_categories, inventory_transactions
  ├── product_lots (batch tracking, expiry dates, FEFO)
  ├── product_serials (individual item tracking, warranty)
  ├── customers → loyalty_cards → loyalty_transactions
  ├── suppliers
  ├── warehouses
  ├── warehouse_transfers (draft→approved→shipped→received)
  ├── orders → order_items
  ├── purchase_orders → purchase_order_items
  ├── payments
  ├── employees → payrolls
  ├── fixed_assets (depreciation tracking)
  ├── projects → project_tasks → project_milestones → project_time_entries
  └── loyalty_rewards
```

---

## Packages

| Package                 | Mô tả                                                                     |
| ----------------------- | ------------------------------------------------------------------------- |
| `@smart-erp/database`   | Drizzle ORM schemas, SQL migrations                                       |
| `@smart-erp/i18n`       | i18next vi/en, `initI18n()`, `useTranslation`                             |
| `@smart-erp/shared`     | Native platform, ERP module, localization, competitive strategy contracts |
| `@smart-erp/types`      | TypeScript types: User, Product, Order, Customer...                       |
| `@smart-erp/validation` | Zod schemas với error messages tiếng Việt                                 |
| `@smart-erp/sync`       | Offline sync + CRDT vector clocks (Dexie)                                 |
| `@smart-erp/ui`         | Button, Card, DataTable, Sidebar, StatCard, Badge...                      |
| `@smart-erp/hooks`      | useDebounce, usePagination, useFormatters, useOnlineStatus...             |
| `@smart-erp/utils`      | formatVND, formatDate, slugify, maskPhone (no React dep)                  |

---

## Bắt đầu

### Yêu cầu

- Node.js >= 20
- pnpm >= 9
- PostgreSQL >= 14
- Rust (cho Tauri desktop)

### Cài đặt

```bash
git clone https://github.com/smart-erp/smart-erp-next.git
cd smart-erp-next
pnpm install
```

### Cấu hình môi trường

```bash
cp apps/api/.env.example apps/api/.env
# Chỉnh sửa DATABASE_URL và JWT_SECRET
```

`apps/api/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/smart_erp
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
```

`apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Database

```bash
# Chạy migration SQL
psql $DATABASE_URL -f packages/database/drizzle/0001_initial_schema.sql

# Hoặc dùng Drizzle migrate
cd packages/database && pnpm migrate
```

### Khởi động

```bash
# Tất cả cùng lúc
pnpm dev

# Riêng lẻ
pnpm --filter @smart-erp/api dev        # API: http://localhost:3000
pnpm --filter @smart-erp/web dev        # Web: http://localhost:3001
pnpm --filter @smart-erp/mobile start   # Mobile: Expo
pnpm --filter @smart-erp/desktop dev    # Desktop: Tauri
pnpm --filter @smart-erp/docs start     # Docs: http://localhost:3002
```

---

## Web Routes

| Route                  | Mô tả                |
| ---------------------- | -------------------- |
| `/login`               | Đăng nhập            |
| `/dashboard`           | Tổng quan            |
| `/pos`                 | Bán hàng tại quầy    |
| `/orders`              | Danh sách đơn hàng   |
| `/orders/[id]`         | Chi tiết đơn hàng    |
| `/products`            | Danh sách sản phẩm   |
| `/products/create`     | Tạo sản phẩm         |
| `/products/[id]/edit`  | Sửa sản phẩm         |
| `/inventory`           | Kho hàng             |
| `/customers`           | Khách hàng           |
| `/customers/create`    | Tạo khách hàng       |
| `/customers/[id]/edit` | Sửa khách hàng       |
| `/suppliers`           | Nhà cung cấp         |
| `/suppliers/create`    | Tạo NCC              |
| `/suppliers/[id]/edit` | Sửa NCC              |
| `/purchasing`          | Đơn nhập hàng        |
| `/purchasing/create`   | Tạo đơn nhập         |
| `/purchasing/[id]`     | Chi tiết + nhận hàng |
| `/payments`            | Thu chi              |
| `/warehouses`          | Quản lý kho          |
| `/reports`             | Báo cáo              |
| `/quality`             | Chất lượng (QMS)     |
| `/omnichannel`         | Bán hàng đa kênh     |
| `/manufacturing`       | Sản xuất (MRP)       |
| `/manufacturing/bom`   | Định mức NVL (BOM)   |
| `/manufacturing/production-orders` | Lệnh sản xuất |
| `/hr/employees`        | Nhân sự              |
| `/hr/payroll`          | Bảng lương           |
| `/users`               | Quản lý người dùng   |
| `/settings`            | Cài đặt              |

---

## Performance Optimizations

- Composite index on `orders(tenant_id, status)` for faster tenant‑scoped order listing
- Composite index on `payments(tenant_id, paid_at)` for faster financial reporting
- Composite index on `inventory_transactions(tenant_id, created_at)` for faster daily and monthly inventory reports
- `.gitattributes` enforces LF line endings across all text files (no CRLF formatting errors)

## Testing

- **Unit Tests**: Powered by Jest. Located at `apps/api/src/**/*.spec.ts`.
- **Coverage**: Includes critical services (Orders, Customers, Inventory, Ecommerce, Accounting, Insights).
- **Run Tests**: `pnpm --filter @smart-erp/api test`

## Commit Convention

```
type(scope): mô tả ngắn gọn

Types: feat, fix, docs, style, refactor, test, chore
Scopes: api, web, mobile, desktop, db, i18n, ui, sync, types, validation, hooks, utils, docs
```

---

## License

MIT © Smart ERP Team
