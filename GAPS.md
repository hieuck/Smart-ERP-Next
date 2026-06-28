# Smart ERP Next — Gaps & Roadmap (Updated 2026-06-26)

Completed: 36 | Remaining: 2

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
| AuthService integration tests | Medium | 5 tests (login, validate, register) |
| UsersService integration tests | Medium | 16 tests (CRUD, findMany) |
| ProductsService integration tests | Medium | 30 tests (CRUD, stock, categories) |
| InventoryService integration tests | Medium | 33 tests (reservations, marketplace) |
| OrdersService integration tests | Medium | 33 tests (e-invoice XML, status workflow) |
| Real CSV/JSON data export | Medium | exportData() with 8 entity types, CSV escaping |
| Lockfile prune | Low | removed stale apps/docs, apps/mobile entries |
| pnpm deps fix | Low | added testing-library, jest-environment-jsdom |
| Structured logging | Medium | StructuredLogger + RequestLoggingInterceptor + 11 tests |
| JWT hardcoded secret | Critical | removed fallback 'super_secret_jwt_key_...' (P0 security) |
| Helmet HTTP headers | Critical | added helmet() middleware (P0 security) |
| Unguarded controllers | High | ForecastController + BenchmarksController secured (P1) |

## Known Tech Debt

| Item | Impact | Notes |
|------|--------|-------|
| ~48 modules flat import | Low | app.module.ts imports all modules without domain grouping |
| Legacy .coverage.spec.ts convention | None | 166 co-located test files — all have real test logic (0 empty stubs) |

## Remaining

| Gap | Priority | Notes |
|-----|----------|-------|
| Gop packages nho | Medium | Deferred |
| Single point of failure | Medium | Tach container khi scale |
| 48 modules nesting | Medium | Domain refactor |
| API versioning | Medium | Needs design, requires frontend coordination |
| Monitoring/logging | Medium | ELK stack setup |
| Barcode scanner POS | Medium | Hardware integration |
| Print templates | Medium | Invoice/PO printing |
| PDF/XLSX export | Medium | Beyond CSV/JSON — needs library integration |

## Closed (Won't Fix)

| Gap | Notes |
|-----|-------|
| CSRF protection | JWT Bearer tokens (stateless) — CSRF only applies to cookie auth |
| Build time optimization | Docker layer cache + CI cache + parallel workers applied |
