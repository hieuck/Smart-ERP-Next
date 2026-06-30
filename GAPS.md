# Smart ERP Next — Gaps & Roadmap (Updated 2026-06-30)

Completed: 78 | Remaining: 2

## Completed

| Gap | Priority | Fix |
|-----|----------|-----|
| dev.bat 2 windows | High | single terminal with start /b |
| Swagger production gate | Medium | gated after NODE_ENV check |
| Rate limiting login | High | 100/60s via env var |
| Login rate limit test | Medium | TDD test: 5 ok, 6th 429 |
| Swagger gate test | Medium | TDD test: disabled in production |
| CONTRIBUTING.md | Medium | created |
| Architecture diagram | Medium | Mermaid added to DEVELOPMENT.md |
| Docker image size | High | removed source, pnpm, ts files |
| Dead code cleanup | Medium | deleted 10 orphaned files |
| POS E2E test skip | High | replaced with page-load test |
| docker-compose.local.yml | Medium | hot-reload dev compose |
| Credentials documentation | Medium | comment explaining purpose |
| Dockerfile mojibake | Low | clean ASCII comments |
| .githooks removed | Low | deleted unused hook |
| CI pipeline optimization | High | merged jobs, Playwright cache, type-check step, frozen lockfile |
| Docker layer caching | High | manifest-first COPY strategy, provenance disabled |
| E2E parallel workers | Medium | workers 1→2, est. 6min→3min |
| 100% service test coverage | High | 792 integration tests covering all 58 services |
| CI unit test gate | High | +pnpm test step, unit tests gate the pipeline |
| Structured logging | Medium | StructuredLogger + RequestLoggingInterceptor |
| JWT hardcoded secret | Critical | removed fallback (P0 security) |
| Helmet HTTP headers | Critical | helmet() middleware (P0 security) |
| Unguarded controllers | High | Forecast + Benchmarks controllers secured |
| Multi-container Docker | High | docker-compose.prod.yml (postgres+api+web) |
| Staging deployment workflow | High | deploy-staging.yml (needs VPS secrets) |
| Refresh token flow | High | access_token 15m + refresh_token 7d + rotation |
| Real forecast from orders | High | ForecastService queries historical order data |
| Global exception filter | High | { success, data, error, requestId } format |
| API response format | High | ResponseFormatInterceptor wraps all responses |
| Print templates | Medium | PrintService: invoice + PO HTML |
| PDF export | Medium | ExportPdfService: pdfkit-based PDF |
| Barcode scan | Medium | GET /products/by-barcode/:code + POS scan UI |
| Barcode label printing | Medium | JsBarcode labels with product name + price |
| Excel import | Medium | ImportService: parse xlsx → preview → confirm |
| Onboarding wizard | Medium | 3-step: company → seed → complete |
| Roles & permissions | Medium | 11 modules × 4 actions, 3 default roles |
| Customer portal | Medium | Order list + detail with tracking timeline |
| Email service | Medium | nodemailer SMTP, configurable via env vars |
| Scheduled tasks | Medium | Daily cron: low stock check + log cleanup |
| Multi-currency | Medium | PriceDisplay + settings/currency API |
| System status API | Medium | GET /status: version, uptime, dbStatus |
| Load test infra | Medium | scripts/load-test.mjs |
| Release notes gen | Low | fetch-depth: 0 + generate-release-notes.js |
| Lockfile prune | Low | removed stale workspace entries |
| pnpm deps fix | Low | added testing-library, jest-environment-jsdom |
| .coverage.spec convention | None | 166 files verified as real tests (0 empty stubs) |
| E2E login fix | High | JWT_SECRET in Playwright config + migration |
| E2E response format | High | jsonOk unwraps { success, data } → data |
| E2E POS checkout | Medium | Full POS flow E2E test |
| E2E feature smoke | Low | Status, currency, export, activity E2E tests |
| Customer portal API test | Medium | 9 tests for controller delegation |
| Committed secret audit | High | `pnpm audit:secrets` added to CI and commit quality gate |
| Mobile PWA manifest and service worker | Medium | installable manifest, production service worker registration, offline fallback, and PWA asset tests |
| API versioning baseline | Low | header-based `X-API-Version` default v1, versioning/error docs, and contract config test |
| Observability stack baseline | Medium | Prometheus/Grafana/Loki compose, `/status/metrics`, alert rules, dashboard provisioning, and config tests |
| Multi-language i18n parity | Medium | Vietnamese mojibake fixes, vi/en key parity backfill, CI/commit parity audit, and regression test |
| CSP headers for API | High | Content-Security-Policy configured with helmet() — script/style/img/connect/font restrictions |
| CSP headers for Web (Next.js) | High | Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy via next.config.mjs headers() |
| Dependency vulnerability scanning | High | `pnpm audit --audit-level=high` added to CI pipeline |
| Global rate limiting | High | ThrottlerModule moved to global AppModule — ALL endpoints rate-limited by default, env-controlled via GLOBAL_RATE_LIMIT |
| Remove unused bcrypt dependency | Low | Only bcryptjs is used in codebase; native bcrypt and @types/bcrypt removed |
| Error code catalog | High | ErrorCode enum + standardized error response in global exception filter |
| Idempotency guard for orders/payments | **High** | IdempotencyGuard prevents duplicate POST requests via Idempotency-Key header |
| Reusable pagination DTO | Medium | PaginationParamsDto with page/limit/sortBy/sortOrder, plus PaginatedResult interface |
| Migration rollback script + docs | High | db-rollback.js script + docs/migration-rollback.md with rollback process |
| loading.tsx for 8 routes | Medium | Dashboard, products, orders, customers, suppliers, inventory, accounting, reports |
| error.tsx for 4 routes | Medium | Dashboard, orders, products, customers |
| SEO metadata for 7 routes | Low | Layout files with metadata export for dashboard, products, orders, customers, inventory, accounting, reports |
| Bundle analyzer setup | Low | @next/bundle-analyzer dev dep + ANALYZE=true script + env-gated config |
| Cross-browser Playwright config | Low | Firefox + WebKit enabled via CROSS_BROWSER env var in e2e Playwright config |
| CodeQL SAST workflow | High | .github/workflows/codeql.yml — runs on push/PR/schedule for JS/TS |
| Performance load test CI step | Low | node scripts/load-test.mjs runs after Playwright in CI |
| Component test sample | Low | Button.test.tsx with render/click/variant tests |
| Audit log interceptor | High | AuditLog decorator + interceptor for sensitive operations on orders |
| API key management | High | ApiKeyService (generate/validate/revoke) + ApiKeyGuard + api_keys schema |
| Flaky test detection script | Medium | scripts/audit-e2e-assertions.js enhanced with flaky detection |

| Item | Impact | Notes |
|------|--------|-------|
| ~48 modules flat import | Low | app.module.ts imports all modules without domain grouping |
| E2E test coverage (12 files) | Medium | Covers critical paths, missing edge cases |
| Docker image size ~2GB | Low | postgres:16-alpine base is large |

## Remaining

| Gap | Priority | Notes |
|-----|----------|-------|
| Deploy staging server (VPS) | **High** | Needs VPS + GitHub secrets (STAGING_HOST, SSH_KEY) |
| Domain refactoring | Medium | 48→6 domain modules |
| API contract testing | **High** | No Pact or OpenAPI spec enforcement in CI |
| Accessibility testing | Medium | No axe-core or Lighthouse CI in pipeline |
| Feature KPIs and success metrics | **High** | No measurable success criteria for ERP modules |
| SAST/DAST container scanning | **High** | CodeQL added; container scanning in release workflow remains |
| Visual regression tests | Medium | No Playwright visual diff or storybook/chromatic |
| Flaky test policy | Medium | No flaky test detection or tracking |
| Staging server deployed | **High** | Needs VPS + GitHub secrets |
| Domain refactoring (48→6) | Medium | Architectural debt |
| Database transaction consistency | **High** | No outbox/saga pattern for distributed operations |

## Team Role Assessment Addendum (2026-06-29)

A role-based review has been added in `docs/team-role-gap-assessment.md` to translate the roadmap into a real dev-team operating model. The highest-priority gaps are product/test traceability, API governance, observability, security program automation, PWA/offline hardening, release rollback playbooks, and data governance for forecast/analytics.

| Role area | New gap | Priority | Tracking |
|-----------|---------|----------|----------|
| Product + QA | PRD/persona/acceptance criteria must trace to automated tests | High | GAP-ROLE-01 |
| Architecture + Backend | API versioning baseline and error catalog shipped; ADR/domain-boundary work remains | High | GAP-ROLE-02/03 |
| SRE + DevOps | Observability stack baseline and alert rules shipped; staging/rollback drill and SLO burn-rate alerts remain | High | GAP-ROLE-04/08 |
| Security | Secret scanning now gates commits/CI; dependency/container scans and ASVS matrix remain | High | GAP-ROLE-05 |
| Frontend/PWA | Production PWA manifest, service worker, offline fallback, and asset tests shipped; conflict UX matrix remains | High | GAP-ROLE-06 |
| Data/AI | Data contracts, PII classification, forecast accuracy monitoring | Medium | GAP-ROLE-09 |
| Support/Docs | Incident runbook, support triage SOP, troubleshooting matrix | Medium | GAP-ROLE-10 |

## Closed (Won't Fix)

| Gap | Notes |
|-----|-------|
| CSRF protection | JWT Bearer tokens (stateless) — CSRF only applies to cookie auth |
| Build time optimization | Docker layer cache + CI cache + parallel workers applied |
