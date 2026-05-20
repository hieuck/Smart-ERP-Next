# Smart ERP Next - Development Owner Plan

Last updated: 2026-05-21

## Current Baseline

Smart ERP Next is already structured as a monorepo with `apps/` for product surfaces and `packages/` for shared contracts, UI, i18n, validation, database, sync, and business primitives. Native clients must consume the same backend API and tenant-scoped domain model; direct database ownership stays in the backend/database package so web, iOS, Android, and desktop do not drift.

Verified coverage at the start of this owner pass was not 100%: statements 14.97%, branches 9.53%, functions 13.15%, lines 15.47%. After the auth/i18n owner slice and TypeScript package fixes, full Jest coverage is statements 15.59%, branches 10.50%, functions 13.50%, lines 16.08% across 25 suites and 166 tests. The project goal remains 100% meaningful coverage, but that cannot be claimed until Jest reports it without excluding real product code.

## Operating Rules

- Keep the repository shape explicit: `apps/web`, `apps/api`, `apps/mobile`, `apps/desktop`, plus reusable `packages/*`.
- Keep Vietnamese resources UTF-8 clean. No replacement characters, no mojibake, and no mixed encoding in docs or source.
- Put cross-platform domain rules in shared packages, then bind them to each native shell.
- Use one tenant-aware API/database contract across all platforms.
- Treat Playwright as the flow verifier for signup, login, POS, product, and critical ERP journeys.
- Commit scoped, reviewable changes because this repository can contain unrelated in-progress work.

## Native Platform Matrix

| Platform            | App            | Runtime             | Ownership                                          |
| ------------------- | -------------- | ------------------- | -------------------------------------------------- |
| Web                 | `apps/web`     | Next.js             | Production web ERP and Playwright flow target      |
| API                 | `apps/api`     | NestJS              | Auth, tenant isolation, ERP modules, integrations  |
| iOS/Android         | `apps/mobile`  | React Native + Expo | Native mobile workflows over the shared API        |
| Windows/macOS/Linux | `apps/desktop` | Tauri               | Native desktop shell over shared packages/API      |
| Shared              | `packages/*`   | TypeScript packages | i18n, validation, database schema, UI, sync, types |

## Competitive Product Pillars

- Vietnam-first ERP: e-invoice, accounting, tax, inventory, purchasing, HR/payroll, approvals, POS, and omnichannel flows localized for Vietnamese operators.
- Better than generic ERPNext/Odoo installs: simpler onboarding, opinionated tenant setup, native apps, and fast operational flows.
- Better than retail-only KiotViet/Nhanhvn/Sapo class tools: deeper accounting, manufacturing, procurement, CRM, workflow automation, and B2B modules.
- Better than desktop/accounting-only systems: shared cloud API, native mobile approvals/POS, cross-platform sync, and modern analytics.
- AI and automation as product primitives: forecasting, anomaly alerts, report builder, workflow engine, and operational assistant surfaces.

## Coverage Path To 100%

1. Lock auth and tenant onboarding first because every platform depends on it.
2. Raise package coverage for deterministic shared logic: validation, i18n, types, sync, SKU/product helpers, and platform registry.
3. Cover API services/controllers by module: products, inventory, orders, purchasing, accounting, approvals, e-invoice, CRM, HR, manufacturing.
4. Add Playwright coverage for real flows: register, login, product creation, category/image/SKU behavior, POS checkout, order lifecycle, inventory movement.
5. Add native smoke checks for mobile and desktop once build artifacts are stable.
6. Only enable strict global 100% thresholds after uncovered legacy surfaces are either tested or deliberately removed.

## Current Owner Slice

- Auth signup/login MVP was verified end-to-end with Playwright in the previous pass.
- Auth service now has focused unit coverage for credential validation, login payloads, self-service tenant creation, existing-tenant registration, duplicate emails, missing company names, and unique tenant slug generation.
- i18n tests now lock critical Vietnamese UI copy and fail on replacement characters in Vietnamese resources.
