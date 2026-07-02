# Changelog

All notable changes to Smart ERP Next are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.4.3] — 2026-07-02

### Fixed
- Container crash after 1-6 hours (`wait -n` exits when web server crashes)
- Web server watchdog with auto-respawn + memory limit (512MB)
- ReportsModule missing from domain modules (all /reports/* endpoints returned 404)
- Docker CACHEBUST build arg for reliable incremental builds

### Added
- X-API-Version: 1 header to axios client (fixes all API calls from frontend)
- ReportBugButton floating component (bottom-right → GitHub Issues)
- Sentry error tracking config (set SENTRY_DSN to enable)
- Static file middleware exclusion (sw.js, manifest.json, offline.html no longer redirect)

### Changed
- Container base image optimizations (pnpm-store cleanup, .d.ts removal)
- Docker HEALTHCHECK uses X-API-Version header
- WebSocket URL uses window.location.origin instead of hardcoded localhost

## [0.3.0] — 2026-06-30

### Added
- CSP headers, rate limiting, idempotency guard, error code catalog
- Feature flags, 2FA/TOTP foundation, audit log interceptor
- API key management service + guard, pagination DTO
- Test data factories, analytics aggregation, migration rollback script
- Outbox pattern, graceful shutdown, structured Loki logging
- 115 GAPS closed, 96 new tests, 15+ architectural docs

### Fixed
- 48 flat modules → 12 domain modules (Core, Commerce, Finance, Infra, Analytics...)
- TelemetryService registered as NestJS provider
- cache-manager v7 → v5 (NestJS compatibility)
- drizzle-kit 0.22.8 → 0.31.10 (ORM compatibility)
- Next.js standalone static file serving

## [0.2.2] — 2026-06-26

### Fixed
- One-click startup: main docker-compose.yml uses pre-built GHCR image
- Docker entrypoint standalone path for web server
- drizzle-kit moved to production dependencies (migration works in Docker image)
- Dynamic API version from package.json (was hardcoded 0.4.0)
- Missing @Controller() decorator on AnalyticsController
- POS negative discount could increase total (Math.max(0, discount))
- Search duplicate API calls on 5 list pages
- Hardcoded Vietnamese strings replaced with i18n t() on POS, invoice, warehouses, purchasing, dashboard
- CI E2E tests: HR employee, accounting, inventory workflows
- 13 web locale mojibake files fixed

### Added
- 48 modules registered (AnalyticsModule, ChatModule, SettingsModule, SocketModule, EcommerceModule, AiCopilotModule)
- CI fully green: 162/162 web E2E tests pass
- i18n 4 locales: vi, en, pt, ru with expanded translations
- docker-compose.dev.yml for building from source

## [0.2.0] — 2026-06-25

- TDD for all controllers + services (100% coverage)
- Removed 62 @ts-nocheck files
- Fixed 29+ end-user bugs from exploratory testing
- Windows pnpm workspace fix: node-linker=hoisted
- Docker unified image with auto-migration + seed
- E2E tests: HR, inventory, accounting workflows
- i18n 4 locales with expanded translations
- Dead code cleanup: removed 34 unused files
- DevOps simplified: removed mobile/desktop builds, monitoring services

## [0.1.0] — 2026-06-15

Initial release with core ERP modules.
