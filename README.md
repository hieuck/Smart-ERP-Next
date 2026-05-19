# Smart ERP Next

**Hệ thống quản trị doanh nghiệp thế hệ mới** — vượt trội ERPNext, Odoo, KiotViet, Nhanhvn, MISA về tốc độ, trải nghiệm và khả năng mở rộng.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![Release](https://img.shields.io/github/v/release/smart-erp/smart-erp-next?include_prereleases)](https://github.com/smart-erp/smart-erp-next/releases/latest)
[![pnpm](https://img.shields.io/badge/pnpm-9+-orange.svg)](https://pnpm.io)

**Há»‡ thá»‘ng quáº£n trá»‹ doanh nghiá»‡p tháº¿ há»‡ má»›i** â€” vÆ°á»£t trá»™i ERPNext, Odoo, KiotViet, Nhanhvn, MISA vá» tá»‘c Ä‘á»™, tráº£i nghiá»‡m vÃ  kháº£ nÄƒng má»Ÿ rá»™ng.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9+-orange.svg)](https://pnpm.io)

---

## So sÃ¡nh vá»›i Ä‘á»‘i thá»§

| TÃ­nh nÄƒng                |    Smart ERP Next     | KiotViet | Nhanhvn | MISA | ERPNext |
| ------------------------ | :-------------------: | :------: | :-----: | :--: | :-----: |
| Native Ä‘a ná»n táº£ng       | âœ… Web+Mobile+Desktop |    âŒ    |   âŒ    |  âŒ  |   âŒ    |
| Offline-first + CRDT     |          âœ…           |    âŒ    |   âŒ    |  âŒ  |   âŒ    |
| MÃ£ nguá»“n má»Ÿ              |          âœ…           |    âŒ    |   âŒ    |  âŒ  |   âœ…    |
| Báº£n Ä‘á»‹a hÃ³a vi/en        |      âœ… Built-in      |    âœ…    |   âœ…    |  âœ…  | Partial |
| Multi-tenant             |          âœ…           |    âŒ    |   âŒ    |  âŒ  |   âœ…    |
| Real-time WebSocket      |          âœ…           | Partial  | Partial |  âŒ  |   âŒ    |
| POS tÃ­ch há»£p             |          âœ…           |    âœ…    |   âœ…    |  âŒ  |   âœ…    |
| Monorepo shared packages |          âœ…           |    âŒ    |   âŒ    |  âŒ  |   âŒ    |
| Lot tracking + Expiry    |          âœ…           |    âŒ    |   âŒ    |  âŒ  |   âŒ    |
| Multi-warehouse transfer |          âœ…           |    âŒ    |   âŒ    |  âŒ  |   âŒ    |
| AI Business Intelligence | âœ… Predictive Stock   |    âŒ    |   âŒ    |  âŒ  | Partial |
| Omnichannel Hub          | âœ… Shopee/TikTok/Amazon/eBay | Partial  | âœ…       |  âŒ  | Partial |
| HR/Payroll               | âœ… Full Module        |    âŒ    |   âŒ    |  âœ…  |   âœ…    |
| Loyalty Program          | âœ… Points/Tiers/Rewards|   âŒ    |   âœ…    |  âŒ  |   âŒ    |
| Fixed Assets             | âœ… Depreciation       |    âŒ    |   âŒ    |  âœ…  |   âœ…    |
| Project Management       | âœ… Tasks/Milestones   |    âŒ    |   âŒ    |  âŒ  |   âœ…    |
| E-Invoice (HÄ Ä‘iá»‡n tá»­)  | âœ… VNPT/Viettel/MISA  |  Addon   |  Addon  |  âœ…  | Partial |

---

## TÃ­nh nÄƒng ná»•i báº­t

### ðŸ§  AI-Powered Business Intelligence
- **Dá»± bÃ¡o nhu cáº§u (Demand Forecasting)**: Sá»­ dá»¥ng lá»‹ch sá»­ bÃ¡n hÃ ng thá»±c táº¿ Ä‘á»ƒ dá»± bÃ¡o tá»“n kho cáº§n thiáº¿t.
- **Gá»£i Ã½ nháº­p hÃ ng tá»± Ä‘á»™ng**: TÃ­nh toÃ¡n sá»‘ lÆ°á»£ng Ä‘áº·t hÃ ng tá»‘i Æ°u dá»±a trÃªn tá»‘c Ä‘á»™ bÃ¡n vÃ  lead time.
- **Inventory Recommendation Service**: AIâ€‘driven reorder suggestions via `/inventory-recommendation/suggest` endpoint.
- **Forecast Dashboard**: Visual demand forecast UI with i18n support.

### ðŸŒ E-commerce Integration Hub (Omnichannel)
- **Äá»“ng bá»™ Ä‘a sÃ n**: Káº¿t ná»‘i Shopee, Lazada, TikTok Shop, Amazon, eBay, Shopify.
- **Chá»‘ng bÃ¡n quÃ¡ Ä‘Ã  (Oversell Protection)**: CÆ¡ cháº¿ giá»¯ hÃ ng (reservation) ngay khi cÃ³ Ä‘Æ¡n tá»« sÃ n.
- **Tá»“n kho kháº£ dá»¥ng thÃ´ng minh**: Tá»± Ä‘á»™ng trá»« safety buffer trÆ°á»›c khi Ä‘áº©y sá»‘ lÆ°á»£ng lÃªn marketplace.
- **Real-time Sync Logs**: Theo dÃµi chi tiáº¿t tá»«ng láº§n Ä‘á»“ng bá»™ dá»¯ liá»‡u.

## ðŸš€ Triá»ƒn khai nhanh (Deployment)

Há»‡ thá»‘ng Ä‘Æ°á»£c thiáº¿t káº¿ Ä‘á»ƒ triá»ƒn khai "Má»™t nÃºt báº¥m" thÃ´ng qua Docker.

### CÃ¡ch 1: Sá»­ dá»¥ng Script tá»± Ä‘á»™ng (KhuyÃªn dÃ¹ng)
Náº¿u báº¡n Ä‘ang dÃ¹ng Windows, chá»‰ cáº§n cháº¡y:
```powershell
./deploy.ps1
```
Script sáº½ tá»± Ä‘á»™ng:
1. Táº¡o file cáº¥u hÃ¬nh `.env`
2. Build toÃ n bá»™ Monorepo (Turbo build)
3. Khá»Ÿi cháº¡y Docker containers (API, Web, DB, AI)

### CÃ¡ch 2: Thá»§ cÃ´ng vá»›i Docker Compose
1. Sao chÃ©p cáº¥u hÃ¬nh máº«u: `cp .env.example .env`
2. Khá»Ÿi cháº¡y: `docker-compose up -d --build`

### Truy cáº­p há»‡ thá»‘ng:
- **Web Dashboard**: `http://localhost:3001`
- **API Swagger**: `http://localhost:3000/api`
- **AI Service**: `http://localhost:8000`

---

## Offlineâ€‘First & Realâ€‘Time
- **Realâ€‘time activity notifications** via WebSockets (tenantâ€‘scoped)
- **Realâ€‘time approval requests** â€“ approvers get instant notifications and can approve/reject directly from the web UI
- **Sync status indicator** with pending changes count and manual/auto retry
- **Conflict resolution** UI for offline edits (powered by Dexie + background sync)

## ðŸ›’ Omnichannel E-commerce Integration

## Tech Stack

| ThÃ nh pháº§n   | CÃ´ng nghá»‡                               |
| ------------ | --------------------------------------- |
| Monorepo     | pnpm 9 + Turborepo 2                    |
| Backend API  | NestJS 10, Drizzle ORM, PostgreSQL 14+  |
| Web App      | Next.js 15, React 19, Tailwind CSS 3    |
| Mobile       | Expo 52, React Native 0.76, SecureStore |
| Desktop      | Tauri 2 (Rust + WebView)                |
| Docs         | Docusaurus 3 (vi/en)                    |
| i18n         | i18next â€” vi máº·c Ä‘á»‹nh, en há»— trá»£        |

## ðŸŒ Internationalization

The application is fully internationalized with support for:
- **Vietnamese (vi)** â€“ default language
- **English (en)**

All userâ€‘facing text uses i18n keys from the `@smart-erp/i18n` package. To add translations, edit the JSON files in `packages/i18n/src/locales/`.
| Validation   | Zod (frontend) + class-validator (API)  |
| Offline Sync | Dexie (IndexedDB) + CRDT vector clocks  |
| Real-time    | Socket.IO 4                             |

---

## Cáº¥u trÃºc dá»± Ã¡n

```
smart-erp-next/
â”œâ”€â”€ apps/
â”‚   â”œâ”€â”€ api/          # NestJS backend â€” 15 modules
â”‚   â”œâ”€â”€ web/          # Next.js 15 â€” 28 pages
â”‚   â”œâ”€â”€ mobile/       # Expo 52 â€” 5 screens + auth
â”‚   â”œâ”€â”€ desktop/      # Tauri 2 â€” wraps web app
â”‚   â””â”€â”€ docs/         # Docusaurus 3 â€” vi/en
â”œâ”€â”€ packages/
â”‚   â”œâ”€â”€ database/     # Drizzle ORM schemas + SQL migrations
â”‚   â”œâ”€â”€ i18n/         # i18next vi/en translations (200+ keys)
â”‚   â”œâ”€â”€ types/        # Shared TypeScript types
â”‚   â”œâ”€â”€ shared/       # Platform/module/localization/positioning contracts
â”‚   â”œâ”€â”€ validation/   # Zod schemas (product, customer, order)
â”‚   â”œâ”€â”€ sync/         # Offline sync + CRDT service (Dexie)
â”‚   â”œâ”€â”€ ui/           # Shared React components (10 components)
â”‚   â”œâ”€â”€ hooks/        # Shared React hooks (5 hooks)
â”‚   â”œâ”€â”€ utils/        # Pure TS utilities (currency, date, string)
â”‚   â”œâ”€â”€ config-eslint/
â”‚   â””â”€â”€ config-typescript/
â””â”€â”€ docs/             # API reference
```

---

## Modules (API + Web)

| Module         | API | Web | Mobile | Desktop |
| -------------- | :-: | :-: | :----: | :-----: |
| Dashboard      | âœ…  | âœ…  |   âœ…   |   âœ…    |
| POS (BÃ¡n hÃ ng) | âœ…  | âœ…  |   âœ…   |   âœ…    |
| ÄÆ¡n hÃ ng       | âœ…  | âœ…  |   âœ…   |   âœ…    |
| Sáº£n pháº©m       | âœ…  | âœ…  |   âœ…   |   âœ…    |
| Kho hÃ ng       | âœ…  | âœ…  |   âœ…   |   âœ…    |
| KhÃ¡ch hÃ ng     | âœ…  | âœ…  |   âœ…   |   âœ…    |
| NhÃ  cung cáº¥p   | âœ…  | âœ…  |   âœ…   |   ðŸ”œ    |
| Mua hÃ ng       | âœ…  | âœ…  |   âœ…   |   ðŸ”œ    |
| Thu chi        | âœ…  | âœ…  |   ðŸ”œ   |   ðŸ”œ    |
| Quáº£n lÃ½ kho    | âœ…  | âœ…  |   ðŸ”œ   |   ðŸ”œ    |
| LÃ´ hÃ ng (Lot) | âœ…  | âœ…  |   ðŸ”œ   |   ðŸ”œ    |
| Chuyá»ƒn kho     | âœ…  | âœ…  |   ðŸ”œ   |   ðŸ”œ    |
| NgÆ°á»i dÃ¹ng     | âœ…  | âœ…  |   ðŸ”œ   |   ðŸ”œ    |
| BÃ¡o cÃ¡o        | âœ…  | âœ…  |   âœ…   |   ðŸ”œ    |
| CÃ i Ä‘áº·t        |  â€”  | âœ…  |   ðŸ”œ   |   ðŸ”œ    |
| **HR/Payroll** | âœ…  | âœ…  |   âœ…   |   âœ…    |
| **Loyalty**    | âœ…  | âœ…  |   âœ…   |   ðŸ”œ    |
| **Fixed Assets**| âœ…  | âœ…  |   âœ…   |   ðŸ”œ    |
| **Projects**   | âœ…  | âœ…  |   âœ…   |   ðŸ”œ    |
| **Quáº£n lÃ½ Sáº£n xuáº¥t (MRP)**| âœ…  | âŒ  |   âœ…   |   âœ…    |
| **Quáº£n lÃ½ Cháº¥t lÆ°á»£ng**    | âœ…  | âŒ  |   âŒ   |   ðŸ”œ    |
| **CRM (Sales Pipeline)**  | âœ…  | âœ…  |   âœ…   |   âœ…    |
| **Äa kÃªnh (Omnichannel)** | âœ…  | âœ…  |   âœ…   |   âœ…    |
| **HÃ³a Ä‘Æ¡n Ä‘iá»‡n tá»­**| âœ…  | âœ…  |   âœ…   |   ðŸ”œ    |
| **Há»£p Ä‘á»“ng Äiá»‡n tá»­ (E-Contract)**| âœ…  | âŒ  |   âœ…   |   âœ…    |
| **Cháº¥m cÃ´ng (HR)**  | âœ…  | ðŸ”œ  |   ðŸ”œ   |   ðŸ”œ    |
| **TÃ­nh lÆ°Æ¡ng (Payroll)**| âœ…  | âŒ  |   âœ…   |   âœ…    |
| **Helpdesk**   | âœ…  | âœ…  |   âœ…   |   ðŸ”œ    |
| **AI Forecast**| âœ…  | âœ…  |   âœ…   |   âœ…    |

---

## Docker

### Cháº¡y AI Forecasting Service

```bash
# Cháº¡y Python AI service (Prophet ML)
docker-compose up -d ai-forecast

# Kiá»ƒm tra health
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
  â”œâ”€â”€ users (roles: admin/manager/accountant/warehouse/sales/user)
  â”œâ”€â”€ products â†’ product_categories, inventory_transactions
  â”œâ”€â”€ product_lots (batch tracking, expiry dates, FEFO)
  â”œâ”€â”€ product_serials (individual item tracking, warranty)
  â”œâ”€â”€ customers â†’ loyalty_cards â†’ loyalty_transactions
  â”œâ”€â”€ suppliers
  â”œâ”€â”€ warehouses
  â”œâ”€â”€ warehouse_transfers (draftâ†’approvedâ†’shippedâ†’received)
  â”œâ”€â”€ orders â†’ order_items
  â”œâ”€â”€ purchase_orders â†’ purchase_order_items
  â”œâ”€â”€ payments
  â”œâ”€â”€ employees â†’ payrolls
  â”œâ”€â”€ fixed_assets (depreciation tracking)
  â”œâ”€â”€ projects â†’ project_tasks â†’ project_milestones â†’ project_time_entries
  â””â”€â”€ loyalty_rewards
```

---

## Packages

| Package                 | MÃ´ táº£                                                                     |
| ----------------------- | ------------------------------------------------------------------------- |
| `@smart-erp/database`   | Drizzle ORM schemas, SQL migrations                                       |
| `@smart-erp/i18n`       | i18next vi/en, `initI18n()`, `useTranslation`                             |
| `@smart-erp/shared`     | Native platform, ERP module, localization, competitive strategy contracts |
| `@smart-erp/types`      | TypeScript types: User, Product, Order, Customer...                       |
| `@smart-erp/validation` | Zod schemas vá»›i error messages tiáº¿ng Viá»‡t                                 |
| `@smart-erp/sync`       | Offline sync + CRDT vector clocks (Dexie)                                 |
| `@smart-erp/ui`         | Button, Card, DataTable, Sidebar, StatCard, Badge...                      |
| `@smart-erp/hooks`      | useDebounce, usePagination, useFormatters, useOnlineStatus...             |
| `@smart-erp/utils`      | formatVND, formatDate, slugify, maskPhone (no React dep)                  |

---

## Báº¯t Ä‘áº§u

### YÃªu cáº§u

- Node.js >= 20
- pnpm >= 9
- PostgreSQL >= 14
- Rust (cho Tauri desktop)

### CÃ i Ä‘áº·t

```bash
git clone https://github.com/smart-erp/smart-erp-next.git
cd smart-erp-next
pnpm install
```

### Cáº¥u hÃ¬nh mÃ´i trÆ°á»ng

```bash
cp apps/api/.env.example apps/api/.env
# Chá»‰nh sá»­a DATABASE_URL vÃ  JWT_SECRET
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
# Cháº¡y migration SQL
psql $DATABASE_URL -f packages/database/drizzle/0001_initial_schema.sql

# Hoáº·c dÃ¹ng Drizzle migrate
cd packages/database && pnpm migrate
```

### Khá»Ÿi Ä‘á»™ng

```bash
# Táº¥t cáº£ cÃ¹ng lÃºc
pnpm dev

# RiÃªng láº»
pnpm --filter @smart-erp/api dev        # API: http://localhost:3000
pnpm --filter @smart-erp/web dev        # Web: http://localhost:3001
pnpm --filter @smart-erp/mobile start   # Mobile: Expo
pnpm --filter @smart-erp/desktop dev    # Desktop: Tauri
pnpm --filter @smart-erp/docs start     # Docs: http://localhost:3002
```

---

## Web Routes

| Route                  | MÃ´ táº£                |
| ---------------------- | -------------------- |
| `/login`               | ÄÄƒng nháº­p            |
| `/dashboard`           | Tá»•ng quan            |
| `/pos`                 | BÃ¡n hÃ ng táº¡i quáº§y    |
| `/orders`              | Danh sÃ¡ch Ä‘Æ¡n hÃ ng   |
| `/orders/[id]`         | Chi tiáº¿t Ä‘Æ¡n hÃ ng    |
| `/products`            | Danh sÃ¡ch sáº£n pháº©m   |
| `/products/create`     | Táº¡o sáº£n pháº©m         |
| `/products/[id]/edit`  | Sá»­a sáº£n pháº©m         |
| `/inventory`           | Kho hÃ ng             |
| `/customers`           | KhÃ¡ch hÃ ng           |
| `/customers/create`    | Táº¡o khÃ¡ch hÃ ng       |
| `/customers/[id]/edit` | Sá»­a khÃ¡ch hÃ ng       |
| `/suppliers`           | NhÃ  cung cáº¥p         |
| `/suppliers/create`    | Táº¡o NCC              |
| `/suppliers/[id]/edit` | Sá»­a NCC              |
| `/purchasing`          | ÄÆ¡n nháº­p hÃ ng        |
| `/purchasing/create`   | Táº¡o Ä‘Æ¡n nháº­p         |
| `/purchasing/[id]`     | Chi tiáº¿t + nháº­n hÃ ng |
| `/payments`            | Thu chi              |
| `/warehouses`          | Quáº£n lÃ½ kho          |
| `/reports`             | BÃ¡o cÃ¡o              |
| `/quality`             | Cháº¥t lÆ°á»£ng (QMS)     |
| `/omnichannel`         | BÃ¡n hÃ ng Ä‘a kÃªnh     |
| `/manufacturing`       | Sáº£n xuáº¥t (MRP)       |
| `/manufacturing/bom`   | Äá»‹nh má»©c NVL (BOM)   |
| `/manufacturing/production-orders` | Lá»‡nh sáº£n xuáº¥t |
| `/hr/employees`        | NhÃ¢n sá»±              |
| `/hr/payroll`          | Báº£ng lÆ°Æ¡ng           |
| `/users`               | Quáº£n lÃ½ ngÆ°á»i dÃ¹ng   |
| `/settings`            | CÃ i Ä‘áº·t              |

---

## Performance Optimizations

- Composite index on `orders(tenant_id, status)` for faster tenantâ€‘scoped order listing
- Composite index on `payments(tenant_id, paid_at)` for faster financial reporting
- Composite index on `inventory_transactions(tenant_id, created_at)` for faster daily and monthly inventory reports
- `.gitattributes` enforces LF line endings across all text files (no CRLF formatting errors)

## Testing

- **Unit Tests**: Powered by Jest. Located at `apps/api/src/**/*.spec.ts`.
- **Coverage**: Includes critical services (Orders, Customers, Inventory, Ecommerce, Accounting, Insights).
- **Run Tests**: `pnpm --filter @smart-erp/api test`

## Commit Convention

```
type(scope): mÃ´ táº£ ngáº¯n gá»n

Types: feat, fix, docs, style, refactor, test, chore
Scopes: api, web, mobile, desktop, db, i18n, ui, sync, types, validation, hooks, utils, docs
```

---

## License

MIT Â© Smart ERP Team
