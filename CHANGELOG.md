# Changelog

All notable changes to Smart ERP Next are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

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
