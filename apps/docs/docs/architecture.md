# Kiến trúc hệ thống

Smart ERP Next được xây dựng theo kiến trúc monorepo, chia sẻ code giữa tất cả các nền tảng.

## Cấu trúc thư mục

```
smart-erp-next/
├── apps/
│   ├── api/          # Backend NestJS — 15 modules
│   ├── web/          # Web app Next.js 15 — 26 pages
│   ├── mobile/       # Mobile app Expo 52 — 5 screens
│   ├── desktop/      # Desktop app Tauri 2
│   └── docs/         # Docusaurus 3 (vi/en)
├── packages/
│   ├── database/     # Drizzle ORM schemas + SQL migrations
│   ├── i18n/         # i18next vi/en (200+ keys)
│   ├── types/        # Shared TypeScript types
│   ├── validation/   # Zod schemas
│   ├── shared/       # Platform, module, localization, positioning contracts
│   ├── sync/         # Offline sync + CRDT (Dexie)
│   ├── ui/           # Shared React components (11 components)
│   ├── hooks/        # Shared React hooks (6 hooks)
│   ├── utils/        # Pure TS utilities (no React dep)
│   ├── config-eslint/
│   └── config-typescript/
└── docs/             # API reference
```

## Công nghệ

| Thành phần  | Công nghệ                                                  |
| ----------- | ---------------------------------------------------------- |
| Monorepo    | pnpm 9 + Turborepo 2                                       |
| Backend     | NestJS 10, JWT, bcrypt, Socket.IO 4                        |
| Database    | PostgreSQL 14+, Drizzle ORM                                |
| Web         | Next.js 15, React 19, Tailwind CSS 3                       |
| Mobile      | Expo 52, React Native 0.76, SecureStore                    |
| Desktop     | Tauri 2 (Rust + WebView)                                   |
| i18n        | i18next, react-i18next                                     |
| Validation  | Zod + class-validator                                      |
| Shared core | `@smart-erp/shared` platform/module/localization contracts |
| Offline     | Dexie (IndexedDB) + CRDT vector clocks                     |
| Real-time   | Socket.IO 4                                                |

## Database Schema (12 tables)

```
tenants
  ├── users (roles: admin/manager/accountant/warehouse/sales/user)
  ├── products
  │     ├── product_categories (hierarchical, self-referencing)
  │     └── inventory_transactions (IN/OUT/ADJUSTMENT)
  ├── customers (groups: retail/wholesale/vip)
  ├── crm_leads (sources: website/referral/trade_show/social_media/email_campaign, statuses: new/contacted/qualified/won/lost)
  ├── crm_leads (sources: website/referral/trade_show/social_media/email_campaign, statuses: new/contacted/qualified/won/lost)
  ├── suppliers
  ├── warehouses (isDefault flag)
  ├── orders
  │     └── order_items (snapshot productName/SKU at sale time)
  ├── purchase_orders
  │     └── purchase_order_items
  └── payments (type: receipt/payment)
```

## API Modules (15)

| Module        | Endpoint            | Mô tả                            |
| ------------- | ------------------- | -------------------------------- |
| Auth          | `/auth`             | Login, register, JWT             |
| Users         | `/users`            | CRUD, tenant-scoped, stats       |
| Tenants       | `/tenants`          | Multi-tenant management          |
| Products      | `/products`         | CRUD, stock adjust, transactions |
| Customers     | `/customers`        | CRUD, debt tracking              |
| Suppliers     | `/suppliers`        | CRUD                             |
| Warehouses    | `/warehouses`       | CRUD, default warehouse          |
| Orders        | `/orders`           | Create, state machine, payment   |
| Purchasing    | `/purchasing`       | PO create, confirm, receive      |
| Inventory     | `/inventory`        | Adjust, history, low-stock       |
| Payments      | `/payments`         | Receipt/payment, summary         |
| Reports       | `/reports`          | Revenue, profit, top-products    |
| Insights      | `/insights`         | Dashboard analytics              |
| Notifications | WS `/notifications` | Real-time events                 |
| Accounting    | `/accounting`       | Chart of accounts, journal entries |
| CRM           | `/crm/leads`        | Lead management, NBA              |
| Accounting    | `/accounting`       | Chart of accounts, journal entries |
| CRM           | `/crm/leads`        | Lead management, NBA              |

## Luồng dữ liệu

```
Client (web/mobile/desktop)
  │
  ├── Online:  HTTP/WebSocket → NestJS API → PostgreSQL
  │
  └── Offline: IndexedDB (Dexie) → SyncQueue → processQueue() khi online
                                             → CRDT conflict resolution (vector clocks)
```

## Multi-tenant Security

Mỗi request được inject `tenantId` qua:

1. **JWT payload** — `req.user.tenantId` (primary, từ login)
2. **X-Tenant-ID header** — fallback cho external integrations
3. **Tất cả DB queries** đều filter theo `tenantId` — không bao giờ cross-tenant

## RBAC (Role-Based Access Control)

| Role       | Quyền                          |
| ---------- | ------------------------------ |
| admin      | Toàn quyền                     |
| manager    | Xem + sửa tất cả, không xóa    |
| accountant | Kế toán, báo cáo, thu chi      |
| warehouse  | Kho hàng, nhập/xuất, mua hàng  |
| sales      | Bán hàng, khách hàng, đơn hàng |
| user       | Chỉ xem                        |

## Offline-first & CRDT Sync

```
1. User action → queueOperation(entity, action, data, entityId)
2. Ghi vào IndexedDB syncQueue với vector clock
3. processQueue() chạy background khi online
4. HTTP 409 Conflict → resolveConflict() với last-write-wins
5. Sau sync thành công → cập nhật entity version
```

**TokenProvider interface** — abstracted để dùng được trên cả web (localStorage) và mobile (SecureStore):

```typescript
interface TokenProvider {
  getToken(): Promise<string | null>;
  getTenantId(): Promise<string | null>;
  getDeviceId(): Promise<string>;
}
```

## Real-time Events (Socket.IO)

| Event                    | Trigger                    |
| ------------------------ | -------------------------- |
| `user.registered`        | Đăng ký tài khoản mới      |
| `order.created`          | Tạo đơn hàng mới           |
| `order.status_changed`   | Thay đổi trạng thái đơn    |
| `order.payment_received` | Nhận thanh toán            |
| `stock.low`              | Tồn kho dưới mức tối thiểu |
| `stock.adjusted`         | Điều chỉnh tồn kho         |
| `system.alert`           | Cảnh báo hệ thống          |

## Bản địa hóa (i18n)

- Ngôn ngữ mặc định: **Tiếng Việt** (`vi`)
- Hỗ trợ: `vi`, `en`
- Package: `@smart-erp/i18n`
- Product locale contract: `@smart-erp/shared` (`LOCALIZATION_PROFILES`, `DEFAULT_LOCALE`)
- Namespace: `common` (tất cả modules)
- Key pattern: `module.key` (ví dụ: `products.title`, `orders.status`)
- 200+ keys mỗi ngôn ngữ

## Native Platform Contract

Smart ERP Next dùng `@smart-erp/shared` làm nguồn sự thật cho app native, module ERP, profile bản địa hóa và trụ cột cạnh tranh. Các app được phép khác nhau về UI/lifecycle nhưng không được tự định nghĩa lại module, locale, currency, timezone, payment method hoặc target support.

| Contract                  | Mục đích                                                                |
| ------------------------- | ----------------------------------------------------------------------- |
| `NATIVE_PLATFORMS`        | Khai báo API, Web, Mobile, Desktop, Docs và trách nhiệm từng target     |
| `ERP_MODULES`             | Module catalog, trạng thái core/growth/planned, offline-first, realtime |
| `LOCALIZATION_PROFILES`   | `vi`/`en`, VND/USD, timezone, date format, tax label, invoice profile   |
| `DIFFERENTIATION_PILLARS` | Cơ sở ưu tiên để vượt ERPNext/Odoo/VietERP/KiotViet/Nhanhvn/MISA        |

## Packages

| Package                 | Mô tả                                                 | Dùng ở      |
| ----------------------- | ----------------------------------------------------- | ----------- |
| `@smart-erp/database`   | Drizzle schemas, migrations                           | API         |
| `@smart-erp/i18n`       | i18next vi/en                                         | Web, Mobile |
| `@smart-erp/types`      | TypeScript types                                      | Tất cả      |
| `@smart-erp/validation` | Zod schemas                                           | Web, API    |
| `@smart-erp/shared`     | Platform, module, localization, positioning contracts | Tất cả      |
| `@smart-erp/sync`       | Offline sync + CRDT                                   | Web, Mobile |
| `@smart-erp/ui`         | React components                                      | Web         |
| `@smart-erp/hooks`      | React hooks                                           | Web         |
| `@smart-erp/utils`      | Pure TS utilities                                     | Tất cả      |
