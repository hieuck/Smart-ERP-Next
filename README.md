# Smart ERP Next

**Hệ thống quản trị doanh nghiệp thế hệ mới** — vượt trội ERPNext, Odoo, KiotViet, Nhanhvn, MISA về tốc độ, trải nghiệm và khả năng mở rộng.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9+-orange.svg)](https://pnpm.io)

---

## So sánh với đối thủ

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

---

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

## 🌍 Internationalization

The application is fully internationalized with support for:
- **Vietnamese (vi)** – default language
- **English (en)**

All user‑facing text uses i18n keys from the `@smart-erp/i18n` package. To add translations, edit the JSON files in `packages/i18n/src/locales/`.
| Validation   | Zod (frontend) + class-validator (API)  |
| Offline Sync | Dexie (IndexedDB) + CRDT vector clocks  |
| Real-time    | Socket.IO 4                             |

---

## Cấu trúc dự án

```
smart-erp-next/
├── apps/
│   ├── api/          # NestJS backend — 15 modules
│   ├── web/          # Next.js 15 — 28 pages
│   ├── mobile/       # Expo 52 — 5 screens + auth
│   ├── desktop/      # Tauri 2 — wraps web app
│   └── docs/         # Docusaurus 3 — vi/en
├── packages/
│   ├── database/     # Drizzle ORM schemas + SQL migrations
│   ├── i18n/         # i18next vi/en translations (200+ keys)
│   ├── types/        # Shared TypeScript types
│   ├── shared/       # Platform/module/localization/positioning contracts
│   ├── validation/   # Zod schemas (product, customer, order)
│   ├── sync/         # Offline sync + CRDT service (Dexie)
│   ├── ui/           # Shared React components (10 components)
│   ├── hooks/        # Shared React hooks (5 hooks)
│   ├── utils/        # Pure TS utilities (currency, date, string)
│   ├── config-eslint/
│   └── config-typescript/
└── docs/             # API reference
```

---

## Modules (API + Web)

| Module         | API | Web | Mobile |
| -------------- | :-: | :-: | :----: |
| Dashboard      | ✅  | ✅  |   ✅   |
| POS (Bán hàng) | ✅  | ✅  |   🔜   |
| Đơn hàng       | ✅  | ✅  |   ✅   |
| Sản phẩm       | ✅  | ✅  |   ✅   |
| Kho hàng       | ✅  | ✅  |   🔜   |
| Khách hàng     | ✅  | ✅  |   ✅   |
| Nhà cung cấp   | ✅  | ✅  |   🔜   |
| Mua hàng       | ✅  | ✅  |   🔜   |
| Thu chi        | ✅  | ✅  |   🔜   |
| Quản lý kho    | ✅  | ✅  |   🔜   |
| Người dùng     | ✅  | ✅  |   🔜   |
| Báo cáo        | ✅  | ✅  |   🔜   |
| Cài đặt        |  —  | ✅  |   🔜   |

---

## Database Schema

```
tenants
  ├── users (roles: admin/manager/accountant/warehouse/sales/user)
  ├── products → product_categories, inventory_transactions
  ├── customers
  ├── suppliers
  ├── warehouses
  ├── orders → order_items
  ├── purchase_orders → purchase_order_items
  └── payments
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
| `/users`               | Quản lý người dùng   |
| `/settings`            | Cài đặt              |

---

## Commit Convention

```
type(scope): mô tả ngắn gọn

Types: feat, fix, docs, style, refactor, test, chore
Scopes: api, web, mobile, desktop, db, i18n, ui, sync, types, validation, hooks, utils, docs
```

---

## License

MIT © Smart ERP Team
