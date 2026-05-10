# Hướng dẫn phát triển

## Yêu cầu

| Công cụ | Phiên bản |
|---------|-----------|
| Node.js | >= 20 |
| pnpm | >= 9 |
| PostgreSQL | >= 14 |
| Rust | >= 1.75 (cho Tauri desktop) |
| Expo CLI | >= 0.18 (cho mobile) |

## Cài đặt

```bash
git clone https://github.com/smart-erp/smart-erp-next.git
cd smart-erp-next
pnpm install
```

## Cấu hình môi trường

```bash
# API
cp apps/api/.env.example apps/api/.env

# Web
cp apps/web/.env.example apps/web/.env.local
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

## Database

```bash
# Chạy migration SQL trực tiếp (khuyến nghị)
psql $DATABASE_URL -f packages/database/drizzle/0001_initial_schema.sql

# Hoặc dùng Drizzle migrate
cd packages/database && pnpm migrate

# Tạo migration mới sau khi thay đổi schema
pnpm generate
```

## Khởi động dev servers

```bash
# Tất cả cùng lúc (Turborepo)
pnpm dev

# Riêng lẻ
pnpm --filter @smart-erp/api dev        # API: http://localhost:3000
pnpm --filter @smart-erp/web dev        # Web: http://localhost:3001
pnpm --filter @smart-erp/mobile start   # Mobile: Expo
pnpm --filter @smart-erp/desktop dev    # Desktop: Tauri
pnpm --filter @smart-erp/docs start     # Docs: http://localhost:3002
```

## Packages

| Package | Mô tả | Dùng ở |
|---------|-------|--------|
| `@smart-erp/database` | Drizzle ORM schemas, SQL migrations | API |
| `@smart-erp/i18n` | i18next vi/en, `initI18n()`, `useTranslation` | Web, Mobile |
| `@smart-erp/types` | TypeScript types: User, Product, Order, Customer... | Tất cả |
| `@smart-erp/validation` | Zod schemas với error messages tiếng Việt | Web, API |
| `@smart-erp/sync` | Offline sync + CRDT vector clocks (Dexie) | Web, Mobile |
| `@smart-erp/ui` | Button, Card, DataTable, Toast, Sidebar... | Web |
| `@smart-erp/hooks` | useDebounce, usePagination, useFormatters, useNotifications... | Web |
| `@smart-erp/utils` | formatVND, formatDate, slugify, maskPhone (no React dep) | Tất cả |

## API Modules

| Module | Endpoint | Mô tả |
|--------|----------|-------|
| Auth | `/auth` | Đăng nhập, đăng ký |
| Products | `/products` | CRUD + stock adjustment + transactions |
| Customers | `/customers` | CRUD + debt tracking |
| Suppliers | `/suppliers` | CRUD |
| Orders | `/orders` | Tạo đơn, state machine, payment |
| Purchasing | `/purchasing` | Đơn nhập, nhận hàng từng phần |
| Payments | `/payments` | Phiếu thu/chi, summary |
| Warehouses | `/warehouses` | CRUD, default warehouse |
| Inventory | `/inventory` | Điều chỉnh kho, lịch sử, low-stock |
| Reports | `/reports` | Revenue, profit, top-products, inventory, customers |
| Insights | `/insights` | Dashboard analytics |
| Users | `/users` | Quản lý người dùng |
| Tenants | `/tenants` | Quản lý tenant |

## Web Pages

| Route | Mô tả |
|-------|-------|
| `/` | Redirect → `/dashboard` |
| `/login` | Đăng nhập |
| `/dashboard` | Tổng quan |
| `/pos` | Bán hàng tại quầy |
| `/orders` | Danh sách đơn hàng |
| `/orders/[id]` | Chi tiết đơn hàng + timeline |
| `/products` | Danh sách sản phẩm |
| `/products/create` | Tạo sản phẩm |
| `/products/[id]` | Chi tiết + lịch sử kho |
| `/products/[id]/edit` | Sửa sản phẩm |
| `/inventory` | Kho hàng + điều chỉnh |
| `/customers` | Khách hàng |
| `/customers/create` | Tạo khách hàng |
| `/customers/[id]` | Chi tiết khách hàng |
| `/customers/[id]/edit` | Sửa khách hàng |
| `/suppliers` | Nhà cung cấp |
| `/suppliers/create` | Tạo NCC |
| `/suppliers/[id]` | Chi tiết NCC |
| `/suppliers/[id]/edit` | Sửa NCC |
| `/purchasing` | Đơn nhập hàng |
| `/purchasing/create` | Tạo đơn nhập |
| `/purchasing/[id]` | Chi tiết + nhận hàng |
| `/payments` | Thu chi (phiếu thu/chi) |
| `/warehouses` | Quản lý kho |
| `/reports` | Báo cáo (doanh thu, lợi nhuận, tồn kho) |
| `/settings` | Cài đặt hệ thống |

## i18n Rules

- Ngôn ngữ mặc định: **Tiếng Việt** (`vi`)
- Hỗ trợ: `vi`, `en`
- Package: `@smart-erp/i18n`
- Luôn dùng `t('section.key')` — không hardcode string tiếng Việt trong component
- Thêm key vào cả `vi/common.json` VÀ `en/common.json`

## Commit Convention

```
type(scope): mô tả ngắn gọn

Types: feat, fix, docs, style, refactor, test, chore
Scopes: api, web, mobile, desktop, db, i18n, ui, sync, types, validation, hooks, utils, docs
```

## Build production

```bash
pnpm build
```

## Type check

```bash
pnpm type-check
```
