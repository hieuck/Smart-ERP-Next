# Smart ERP Next — Gaps & Roadmap (Updated 2026-07-02)

Completed: 171 | Remaining: 1

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
| API contract tests | High | Health, Auth, Products, Orders, Response format contract tests |
| WebSocket reconnection handling | Medium | 'reconnect' event handler with room re-ack in socket gateway |
| Ownership matrix + Definition of Done | Medium | docs/ownership-matrix.md with module ownership, DoD, engineering KPIs |
| Forecast accuracy monitoring docs | Low | docs/forecast-accuracy-monitoring.md with metrics and monitoring process |
| Feature flags service | Medium | FeatureFlagsService + Controller + api + schema (TDD: 9 tests) |
| 2FA/TOTP foundation | High | TotpService with generate/verify/provisioning URI (TDD: 7 tests) |
| Visual regression testing setup | Medium | Playwright haveScreenshot test + snapshotPathTemplate config |
| Accessibility testing via axe-core | Medium | e2e/accessibility.spec.ts with @axe-core/playwright integration |
| Semantic versioning policy | Low | docs/semver-policy.md with MAJOR/MINOR/PATCH definitions |
| PII classification docs | Low | docs/pii-classification.md with data classification levels |
| Competitive positioning docs | Low | docs/competitive-positioning.md with competitor analysis |
| Outbox pattern for event durability | **High** | OutboxService (emit/processPending/cleanup) + outbox_events schema (TDD: 6 tests) |
| Graceful shutdown | High | GracefulShutdownService with SIGTERM/SIGINT handlers, 30s timeout (TDD: 3 tests) |
| Backup restore verification script | Medium | scripts/verify-backup.js with file validation + SQL content check |
| Data archival strategy docs | Medium | docs/data-archival.md with retention policies per table |
| Secrets management docs | Medium | docs/secrets-management.md with production recommendations |
| Structured log shipping to Loki | Medium | LokiLoggerService with push/error methods (TDD: 5 tests) |
| Alert notification service | High | AlertService with Slack/Email/PagerDuty channels (TDD: 5 tests) |
| SBOM generation script | Low | scripts/generate-sbom.js — CycloneDX JSON from pnpm-lock.yaml |
| Feature usage telemetry | Medium | TelemetryService + telemetry_events schema (TDD: 3 tests) |
| Environment parity check | Low | scripts/check-env-parity.js — validates matching env var keys |
| Test data factories | Medium | @smart-erp/test-utils with buildUser/buildProduct/buildCustomer/buildOrder (TDD: 7 tests) |
| loading.tsx for all 19 remaining routes | Medium | loading spinners for approvals/automation/chat/crm/e-invoice/fixed-assets/forecast/hr/manufacturing/payments/pos/purchasing/quality/settings/users/warehouse-transfers/warehouses |
| Analytics aggregation service | Medium | AggregationService with dailyRevenue/topProducts/orderStats (TDD: 4 tests) |
| SBOM in release workflow | Low | sbom.json artifact generated during Docker build in release.yml |
| Telemetry wired to order creation | Medium | TelemetryService injected into OrdersService, tracks order.created event |
| error.tsx for all 21 remaining routes | Medium | Error boundaries for accounting/approvals/automation/chat/crm/e-invoice/fixed-assets/forecast/hr/inventory/manufacturing/payments/pos/purchasing/quality/reports/settings/suppliers/users/warehouse-transfers/warehouses |
| Domain refactoring 48→12 modules | **High** | CoreModule, FinanceModule, InfraModule expanded — 28 flat imports reduced to 12 domain modules |
| Environment variable validation | High | EnvValidatorService with required checks + default/dev value detection (TDD: 6 tests) |
| Dependabot auto-updates | Medium | .github/dependabot.yml with grouped updates for NestJS, React, ESLint, testing |
| Health check detail | Medium | HealthMonitorService with DB failure detection coverage (TDD: 2 tests) |
| Feature flag caching | Medium | In-memory TTL cache for isEnabled, auto-invalidate on setFlag (TDD: 3 tests) |
| API key usage tracking | Medium | lastUsedAt timestamp on validate, getUsageStats endpoint (TDD: 2 tests) |
| Input sanitization utility | Medium | sanitizeHtml/sanitizeUrl/trimAndClean in @smart-erp/utils (TDD: 8 tests) |
| WebSocket shutdown notification | Medium | notifyShutdown emits server.shutdown event before force close |
| Rate limit response headers | Medium | X-RateLimit-Limit/Remaing/Reset via interceptor (TDD: 2 tests) |
| Security headers audit | Medium | helmet-config extracted, CSP audit tests (TDD: 5 tests) |
| Slow query logging | Medium | SlowQueryLoggerInterceptor warns on >1s requests (TDD: 2 tests) |
| Docker vulnerability scanning | High | Trivy filesystem scan in CI (HIGH/CRITICAL severity) |
| CORS hardened config | Medium | cors-config.ts extracted with env-based origins, tests (TDD: 5 tests) |
| Graceful shutdown wired | High | GracefulShutdownService + EnvValidatorService in bootstrap |
| API envelope consistency | Medium | Response format contract tests for success/error shapes |
| Migration test script | Medium | scripts/test-migration.js — validates drizzle-kit generate + migrate |
| Request timeout middleware | High | RequestTimeoutMiddleware (30s default, env-configurable) (TDD: 3 tests) |
| WebSocket shutdown notification | Medium | GracefulShutdownService.setNotifyClients → SocketGateway.notifyShutdown |
| Docker image labels | Low | org.opencontainers.* labels for metadata |
| Healthcheck improved | Low | 30s interval, 5s timeout, 30s start-period, 3 retries |
| RequestIdMiddleware wired | Medium | Applied in AppModule, propagates x-request-id through all requests |
| Swagger @ApiTags for core routes | Low | Orders, Products tagged — improves API doc navigation |
| REQUEST_TIMEOUT env var | Low | Configurable request timeout via environment variable |
| DB pool configuration | High | buildPoolConfig with max/idleTimeout/connectionTimeout, env-configurable (TDD: 5 tests) |
| Load test baseline output | Low | JSON baseline saved in CI for performance regression tracking |
| Sentry error tracking config | Medium | sentry-config.ts with DSN/env/tracesSampleRate |
| DB_POOL_* env vars | High | DB_POOL_MAX, DB_POOL_IDLE_TIMEOUT, DB_POOL_CONNECTION_TIMEOUT |
| Outbox integration tests | High | emit + processPending + cleanup + failure scenarios (TDD: 4 tests) |
| Feature flags integration tests | High | setFlag + isEnabled + getAllFlags + update (TDD: 4 tests) |
| Swagger docs for orders | Medium | @ApiOperation + @ApiResponse + @ApiBearerAuth on all endpoints |
| Swagger API doc exports | Low | @ApiTags on 14 core controllers, full docs on Orders |
| Backup scheduling docs | Low | docs/backup-scheduling.md with cron/systemd/service examples |
| Telemetry service integration tests | High | track + trackPageView + error handling (TDD: 4 tests) |
| Aggregation service integration tests | Medium | dailyRevenue + topProducts + orderStats (TDD: 4 tests) |
| Load test with auth endpoints | Medium | products + orders endpoints added to load-test.mjs |
| Makefile | Low | make dev/test/lint/typecheck/build/clean/ci targets |
| VS Code workspace settings | Low | .vscode/extensions.json + settings.json for team onboarding |
| API deprecation header pattern | Medium | @Deprecated decorator + Sunset/Deprecation/Link headers (TDD: 3 tests) |
| SECURITY.md | **Critical** | Security policy with vulnerability reporting, supported versions, disclosure policy |
| Docker image cleanup | Medium | Removes pnpm-store, .npm, *.d.ts, *.md, /tmp, apk cache in runtime stage (TDD: 6 tests) |
| Cron scheduler monitoring | Medium | SchedulerMonitorService tracks runs/failures/consecutive failures (TDD: 5 tests) |
| scheduler_log schema | Low | Database table for scheduler execution history |
| Sentry error reporting | High | GlobalExceptionFilter captures 500 errors when SENTRY_DSN configured |
| API key rate limiting | High | ApiKeyThrottlerGuard with 200/100 per-minute limits (TDD: 4 tests) |
| scheduler_log indexes | Medium | Index on job_name + created_at for query performance |
| Compression middleware | Low | Express compression for API response body compression |
| Auth flow integration tests | High | Full register→login→refresh→logout flow (TDD: 8 tests) |
| OpenAPI spec generation script | Low | scripts/generate-api-docs.js exports Swagger spec to JSON |
| Auth flow integration tests | High | Full register→login→refresh→logout (TDD: 8 tests) |
| Dependency vulnerability fix | **Critical** | next 15.2.6→15.5.18 (11 vulns), drizzle-orm 0.31.4→0.45.2 (SQL injection) |
| CodeQL v3→v4 | Medium | github/codeql-action upgraded to v4 for Node 24 compatibility |
| NestJS Dependabot PR merged | Medium | 14 NestJS dependency updates |
| Docker Compose healthcheck alignment | Low | Consistent 30s/5s/30s/3 retries across all compose files |
| Merge Dependabot testing group PR | Medium | @playwright/test, jest, @types/jest, playwright updated |
| Merge Dependabot react group PR | Medium | react, react-dom, react-i18next, react-icons updated |
| Fix deploy-staging CI failure noise | Medium | Gated job on STAGING_HOST secret, skipped when unconfigured |
| Fix CodeQL SAST SARIF upload failure | Low | Removed custom output/category from analyze step |
| Product/QA traceability foundation | High | PRD template, product-to-test matrix, and `pnpm audit:product-traceability` quality gate added |
| Real-team role readiness operating model | Medium | RACI/checklist/evidence cadence matrix plus `pnpm audit:team-roles` quality gate added |
| Flaky test quarantine policy | Medium | `pnpm audit:flaky-tests` blocks committed focused tests and unowned skips/quarantines; policy documented in `docs/qa/flaky-test-policy.md` |
| Idempotency key route scoping | High | IdempotencyGuard now scopes keys by method + route + key to avoid false conflicts across endpoints; regression test added |
| Idempotency store TTL and bound | High | IdempotencyGuard now expires old keys and caps in-memory records via IDEMPOTENCY_TTL_MS/IDEMPOTENCY_MAX_RECORDS; TDD regression tests added |

| Item | Impact | Notes |
|------|--------|-------|
| ~48 modules flat import | Low | app.module.ts imports all modules without domain grouping |
| E2E test coverage (12 files) | Medium | Covers critical paths, missing edge cases |
| Docker image size ~2GB | Low | postgres:16-alpine base is large |
| Trivy SARIF upload + safe pin | High | CI uploads Trivy SARIF to code scanning and pins action to v0.35.0 |
| Trivy vulnerability enforcement | High | CI fails after SARIF upload when Trivy finds HIGH/CRITICAL issues |
| Staging deploy preflight | Medium | deploy-staging.yml validates VPS secrets and sets up Docker Buildx before deploy |
| GitHub Actions policy audit | Medium | `pnpm audit:github-actions` gates mutable actions, missing SARIF, and ungated staging steps |
| Next.js 16 lint command | High | Web lint uses ESLint flat config directly because `next lint` was removed in Next.js 16 |

## Remaining

| Gap | Priority | Notes |
|-----|----------|-------|
| Deploy staging server (VPS) | **High** | Needs VPS + GitHub secrets (STAGING_HOST, SSH_KEY) — blocked on infrastructure |

## Team Role Assessment Addendum (2026-07-02)

A role-based review has been added in `docs/team-role-gap-assessment.md` to translate the roadmap into a real dev-team operating model. The highest-priority gaps are now staging infrastructure, endpoint-level API governance, SLO burn-rate alert tuning, security program automation, PWA conflict UX, release rollback drills, and data governance for forecast/analytics. Product/test traceability now has a baseline PRD template, matrix, and audit gate; real-team role readiness now has a RACI/checklist matrix and audit gate; flaky-test quarantine ownership now has a documented policy and audit gate.

| Role area | New gap | Priority | Tracking |
|-----------|---------|----------|----------|
| Product + QA | ✅ PRD template + product-to-test matrix + audit gate added; continue expanding per module PRD rows | Medium | GAP-ROLE-01 |
| Engineering management | ✅ Real-team RACI/checklist/evidence cadence matrix added; continue using it in PR reviews | Medium | ROLE-OPS |
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
