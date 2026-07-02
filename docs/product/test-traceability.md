# Product-to-Test Traceability Matrix

This matrix closes the Product/QA role gap by linking high-risk ERP workflows to automated checks. New PRDs must add or update at least one row before implementation starts.

| Trace ID | Module | Persona | Critical workflow | Acceptance evidence | Automated checks | Owner |
|---|---|---|---|---|---|---|
| TR-SALES-001 | Sales / Orders | Sales staff | Create an order without duplicating payment/order mutations | Idempotency key prevents duplicate POST requests | `apps/api/src/common/errors/idempotency.guard.spec.ts`, `apps/api/src/orders/orders.service.spec.ts` | Backend + QA |
| TR-POS-001 | POS | Cashier | Sell while network conditions vary and recover from offline fallback | PWA shell and offline fallback are served correctly | `scripts/__tests__/pwa-assets.test.js`, `e2e/tests/10-pos-checkout.spec.ts` | Frontend/PWA + QA |
| TR-INVENTORY-001 | Inventory | Warehouse operator | Find products by barcode and keep inventory visible | Barcode lookup and product APIs return consistent envelope | `apps/api/src/products/products.controller.coverage.spec.ts`, `e2e/tests/11-feature-smoke.spec.ts` | Backend + QA |
| TR-ACCOUNTING-001 | Accounting | Accountant | Generate export/print evidence for accounting documents | PDF/print services generate expected output | `apps/api/src/__tests__/export-pdf-integration.spec.ts`, `apps/api/src/__tests__/print-integration.spec.ts` | Backend + QA |
| TR-FORECAST-001 | Forecast | Business owner | Review demand forecast from historical order data | Forecast service uses order history and monitoring docs define accuracy checks | `apps/api/src/forecast/forecast.service.coverage.spec.ts`, `docs/forecast-accuracy-monitoring.md` | Data/AI + QA |
| TR-SECURITY-001 | Platform | Admin | Protect sensitive APIs and operational secrets | Secret audit, auth flow, and security headers gates pass | `scripts/__tests__/audit-secrets.test.js`, `apps/api/src/__tests__/auth-flow-integration.spec.ts`, `apps/api/src/__tests__/security-headers.spec.ts` | Security + QA |
| TR-RELEASE-001 | Release | Release manager | Promote, smoke test, and roll back safely | Release smoke and rollback docs are updated for production changes | `scripts/__tests__/release-runtime-smoke.test.js`, `docs/migration-rollback.md` | Release + SRE |

## Update rules

1. Every PRD must reference at least one Trace ID.
2. Every high-risk Trace ID must have an automated check or an explicitly owned manual validation note.
3. QA reviews this file before closing a role-based gap in `GAPS.md`.
4. Release notes should mention any Trace ID whose behavior changed for end users.
