# Changelog

All notable changes to Smart ERP Next are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- **Omnichannel Inventory Hub (Full Stack)**:
  - Backend: `inventory_reservations` schema and APIs for oversell prevention
  - API: Stock push to marketplaces (Shopee/Lazada/TikTok/Amazon/eBay)
  - Web: E-commerce Integration UI (Stores, Logs, Settings)
  - Web: "Omnichannel" tab in Inventory page with manual push actions
  - Mobile: Native "Omnichannel" screen with navigation and status tracking
- **AI-Powered Demand Forecasting**:
  - ForecastService uses real order history (90-day) with statistical prediction
  - Multi-platform support: Web and Mobile analytics screens
- **Stability**: Fixed critical JSX errors in Inventory and Admin Performance pages.

### Added
- **AI-Powered Demand Forecasting**: ForecastService uses real order history (90-day) with statistical prediction, confidence levels, and reorder recommendations
- Demand forecast API endpoints: `/analytics/forecast/demand` (global) and `/analytics/forecast/product/:id` (per-product)
- Enhanced Web Forecast page with MAPE, recommended reorder quantity, confidence level, historical average
- Updated Mobile ForecastScreen with real API data and improved UI
- DemandForecastWidget component for product detail pages showing 30-day forecast metrics
- i18n keys for forecast metrics (vi/en): mape, confidence, historical average, reorder suggestion

### Added
- **Quick-create purchase order from reorder suggestions** (Web + Mobile + API)
- Lot tracking & serial numbers: product_lots, product_serials schemas, CRUD API
- Warehouse transfers: draft→approved→shipped→received workflow
- Activity logging for lot and transfer operations
- Multi-platform inventory parity: Desktop InventoryScreen, Mobile inventory upgrade
- Suppliers, Warehouses, Purchasing screens for mobile (native parity)
- Mobile ReportsScreen: sales summary, top products/customers, inventory report
- Per-item qty and exclude controls in quick-create PO modal
- Warehouse and expected date fields in quick-create PO
- Post-create navigation to purchasing list (Web + Mobile)

### Added
- **Web client offline sync**: Dexie-powered offline storage, background sync with CRDT merge
- Sync button + status indicator in app header
- Products page now works offline and syncs when online
- Offline-first sync foundations: sync_metadata table, /sync/pull and /sync/push endpoints
- i18n keys for sync status (online/offline, last sync, pending changes)

### Added
- Reorder point management: set minimum stock and reorder quantity per product
- Auto-suggested purchase order quantities when stock falls below reorder point
- New "Reorder points" tab in inventory page with inline editing
- API endpoints: PATCH /products/:id/reorder-points, GET /inventory/reorder-suggestions

## [0.3.0] — 2026-05-10

### Added — Wave 6
- **API**: Payments module — phiếu thu/chi, summary stats, PT/PC code generation
- **API**: Warehouses module — CRUD, default warehouse, tenant-scoped
- **API**: Users service — full tenant isolation, stats endpoint, never returns passwordHash
- **API**: Auth service — direct DB insert for register (preserves passwordHash)
- **Web**: Payments page — receipt/payment list, summary cards, create modal with 6 payment methods
- **Web**: Warehouses page — card grid, create/edit modal, set-default action
- **Web**: AppLayout — added payments + warehouses nav items
- **Mobile**: Shared `api.ts` client — all screens now use SecureStore token
- **Mobile**: `SecureStoreTokenProvider` — mobile-native sync token provider
- **Mobile**: `mobileSyncService` — SyncService instance with SecureStore
- **Packages**: `@smart-erp/sync` — `TokenProvider` interface abstraction, `LocalStorageTokenProvider` for web
- **Packages**: `@smart-erp/ui` — added `lucide-react` dep, `tsconfig.json`
- **i18n**: Added `payments` and `warehouses` sections (vi/en)
- **Docs**: Architecture.md — full rewrite with 15 modules, RBAC table, TokenProvider docs
- **LICENSE**: MIT

### Fixed
- Mobile screens `OrdersScreen`, `CustomersScreen`, `ProductsScreen` — replaced `token = ''` with `api.ts`
- `DashboardScreen` — uses `api.ts` instead of direct fetch with SecureStore
- Users service — `findAll` now always requires `tenantId` (security fix)
- Users controller — uses `req.user.tenantId` from JWT instead of middleware

---

## [0.2.0] — 2026-05-10

### Added — Wave 5
- **API**: Purchasing module — create PO, confirm, receive goods (partial/full), cancel
- **Web**: Purchasing pages — list, create with product+supplier search, detail with receive modal
- **Web**: Product detail page — stock card, pricing with margin, transaction history
- **Web**: Customer detail page — contact info, recent orders, debt card, loyalty points
- **Web**: Supplier detail page — contact, bank info, recent POs
- **Web**: Root page.tsx — redirect to /dashboard
- **Web**: AppLayout — dark mode toggle (Sun/Moon), NotificationCenter integration
- **Web**: NotificationCenter — real-time Socket.IO events, unread badge, dismiss
- **Web**: ToastProvider + useToast — global toast system
- **Web**: Anti-flash dark mode script in layout
- **Web**: Be Vietnam Pro + Inter fonts with Vietnamese subset
- **Mobile**: DashboardScreen — real /insights/dashboard data, pull-to-refresh
- **Mobile**: LoginScreen — KeyboardAvoidingView, show/hide password, SecureStore
- **Mobile**: App.tsx — auth flow with SecureStore, loading splash, logout
- **Packages**: `@smart-erp/utils` — formatVND, formatDate, slugify, maskPhone
- **Packages**: `@smart-erp/hooks` — useNotifications (toast queue)
- **Packages**: `@smart-erp/ui` — Toast + ToastContainer components
- **Docs**: Rewrite README, docs/api.md, development.md

### Fixed
- Products service — all queries now filter by tenantId (security fix)
- JWT strategy — normalise payload to expose both `sub` and `userId`
- api-products.ts — correct return types (price/cost as string from DB)
- Middleware — skip static assets, preserve ?from= param on redirect

---

## [0.1.0] — 2026-05-10

### Added — Waves 1–4
- **API**: 13 modules — auth, users, tenants, products, customers, suppliers, orders, inventory, reports, insights, notifications
- **Web**: 24 pages — dashboard, POS, orders, products, inventory, customers, suppliers, purchasing, reports, settings
- **Mobile**: 5 screens — login, dashboard, products, orders, customers
- **Desktop**: Tauri 2 setup with min window size, Rust commands
- **Database**: 12 tables with full indexes and foreign keys
- **Packages**: database, i18n (vi/en 200+ keys), types, validation, sync (CRDT), ui (10 components), hooks (6 hooks)
- **Docs**: Docusaurus 3 with vi/en locales, architecture, development, API reference
- **i18n**: 200+ translation keys per language covering all modules
- **Offline**: Dexie IndexedDB + CRDT vector clock sync
- **Real-time**: Socket.IO notifications (order.created, stock.low, etc.)
- **POS**: Full terminal — product search, cart, 6 payment methods, change calculation
- **Reports**: Revenue, profit, top-products, inventory, customers with real SQL aggregations

---

## [0.0.1] — Initial

- Project scaffold with pnpm monorepo + Turborepo
- Basic NestJS API with products CRUD
- Basic Next.js web app
