# Team Role Gap Assessment — 2026-07-02 (Updated)

Mục tiêu của tài liệu này là review Smart ERP Next như một team phát triển sản phẩm thật, tách theo từng vai trò để chủ repo có thể ưu tiên backlog/PR tiếp theo. Đánh giá dựa trên cấu trúc repo hiện tại, tài liệu, CI/CD, test suite và các script vận hành có sẵn trong repository.

## Executive summary

Smart ERP Next đã có nền tảng mạnh cho một ERP SME: monorepo rõ ràng, API NestJS, web Next.js, shared packages, Drizzle/PostgreSQL, test unit/integration/E2E, Docker và CI. Tuy nhiên, để vận hành như một team production thực thụ, repo còn thiếu các artefact quản trị sản phẩm, release, bảo mật, vận hành và QA định lượng. Các gap quan trọng nhất sau vòng fix 2026-07-02 là:

1. **Product/Business**: đã có PRD template, traceability matrix baseline và role-readiness operating model; còn cần điền PRD chi tiết/KPI cho từng module ERP.
2. **Architecture/Backend**: domain còn phẳng, API versioning chưa có, migration/seed cần chuẩn hóa rollback và dữ liệu test theo môi trường.
3. **Frontend/UX**: PWA/offline mới ở mức nền tảng; cần UX audit, accessibility audit và design system governance.
4. **QA/Automation**: test nhiều nhưng cần quality dashboard, mutation/contract tests và chuẩn test ownership theo module.
5. **DevOps/SRE**: thiếu observability stack, staging thật, release playbook, backup/restore drill và SLO/SLA.
6. **Security/Compliance**: cần threat model, dependency/container scanning, secret scanning, audit log policy và phân quyền production-grade.
7. **Data/Analytics/AI**: cần data contracts, lineage, monitoring drift cho forecast và governance cho dữ liệu nhạy cảm.
8. **Documentation/Support**: tài liệu user/dev đã có nhưng thiếu runbook incident, onboarding checklist theo role và support triage process.

## Đánh giá theo vai trò team dev thật

| Vai trò | Hiện trạng quan sát được | Gap cần PR/backlog | Ưu tiên |
|---|---|---|---|
| Product Manager | README mô tả module, roadmap/gaps tồn tại; PRD template mới nằm ở `docs/product/prd-template.md`. | Điền PRD/module charter thật cho Sales, Inventory, Accounting, HR; thêm metric success như activation, task completion, time-to-invoice. | Medium |
| Business Analyst / Domain SME | Có nhiều module ERP và docs hướng dẫn module. | Cần mapping nghiệp vụ chuẩn Việt Nam: VAT/e-invoice, kế toán, tồn kho, lương; thêm glossary domain và business rules traceability từ yêu cầu → test. | High |
| Engineering Manager | Monorepo và scripts dev/CI đã tương đối rõ; role-readiness matrix mới định nghĩa RACI/checklist/evidence cadence cho từng vai trò. | Cần áp dụng matrix này vào PR review, release calendar, module risk register và capacity planning cho debt/domain refactor. | Medium |
| Solution Architect | Kiến trúc apps/packages rõ: API, web, database, shared, sync, accounting. | Domain modules còn phẳng; cần ADRs cho API versioning, multi-tenant isolation, eventing/webhook reliability, offline conflict strategy và boundaries giữa packages. | High |
| Backend Engineer | NestJS API lớn, nhiều services/controllers/tests. ✅ Global rate limiting, ✅ error code catalog, ✅ idempotency guard, ✅ pagination DTO, ✅ migration rollback docs, ✅ marketplace stock push now calls configured upstream endpoints, ✅ Amazon/eBay ecommerce sync no longer suppresses client API drift with `@ts-ignore`, ✅ exchange-rate cache aligned with the real currency-id schema. | Added route-scoped idempotency regression coverage, marketplace stock-push regression coverage, ecommerce client API drift regression coverage, and exchange-rate schema-drift coverage; còn API contract tests, versioning endpoint-by-endpoint, distributed transaction consistency. | High |
| Frontend Engineer | Next.js web app, shared UI, hooks, localization. ✅ CSP headers, ✅ loading/error UX (12 routes), ✅ SEO metadata (7 routes), ✅ bundle analyzer. | Còn accessibility audit, visual regression tests, design system governance, offline UX checklist. | High |
| Mobile/PWA Engineer | Repo có nền sync/offline và web app PWA-ready. | ✅ conflict UX matrix đã có; còn mở rộng entity type, populate real diff, background sync UX và device matrix. | Medium |
| QA Engineer / SDET | Có Jest, Playwright, E2E, audit scripts và quality gate. ✅ Product-to-test traceability matrix + audit gate, ✅ flaky quarantine audit, ✅ component test sample, ✅ cross-browser config, ✅ load test CI, ✅ CodeQL SAST. | Còn contract/API schema tests, visual regression mở rộng, accessibility reporting, flaky test quarantine policy, coverage dashboard. | High |
| DevOps / Platform Engineer | Có Docker, compose prod, CI, release workflow và deploy scripts. | Cần staging server thực, IaC, environment promotion, SBOM/container scan, rollback release playbook, secrets rotation và artifact provenance. | High |
| SRE / Operations | Có status API, health-check scripts, backup scripts. | Cần metrics/logs/traces stack, alerts, SLO/SLA, incident runbook, backup restore drill, load test baseline và capacity plan. | High |
| Security Engineer | Đã xử lý một số P0 như JWT secret, Helmet (CSP added), auth guards, pnpm audit CI, ✅ CodeQL SAST. | Cần threat model, OWASP ASVS checklist, DAST/container scan, audit log retention, permission test matrix. | High |
| Data Engineer / Analytics | Có forecast docs, analytics/reports E2E và database package. | Cần data contracts, warehouse/export strategy, event naming, reconciliation reports, forecast accuracy monitoring và PII classification. | Medium |
| UX Researcher / Designer | User guide và flows hiện diện. | Cần usability test script, role-based journey maps, accessibility review, empty/error/loading state inventory và localization review cho tiếng Việt/English. | Medium |
| Technical Writer / Support | Docs user/dev/API/production có sẵn. | ✅ Troubleshooting matrix added; còn docs information architecture, release notes template cho non-technical users và onboarding checklist theo role. | Medium |
| Release Manager | Có release workflow và release notes generator. | Cần semantic versioning policy, changelog governance, release candidate checklist, rollback criteria và production readiness review. | Medium |

## Gap backlog đề xuất cho chủ repo

| ID | Gap | Why it matters | Suggested PR scope | Owner role |
|---|---|---|---|---|
| GAP-ROLE-01 | Product requirements cần tiếp tục mở rộng theo module | Giảm rủi ro build sai nghiệp vụ ERP. | ✅ Added `docs/product/prd-template.md`, `docs/product/test-traceability.md`, and `pnpm audit:product-traceability`; next: write concrete PRDs/KPIs for each module. | PM + BA + QA |
| GAP-ROLE-02 | Thiếu ADR cho quyết định kiến trúc lớn | Giúp team mới hiểu trade-off và tránh refactor cảm tính. | ✅ Added `docs/adr/0001-record-architecture-decisions.md` and `docs/adr/0002-api-versioning-and-domain-boundaries.md`; future ADRs follow this format. | Architect |
| GAP-ROLE-03 | API versioning/error catalog chưa chuẩn hóa | Bảo vệ backward compatibility cho web/mobile/integration partners. | Header-based `X-API-Version` v1, `docs/api-versioning.md`, `docs/api-errors.md` và config contract test đã có; tiếp theo là endpoint-by-endpoint contract tests. | Backend |
| GAP-ROLE-04 | Observability production chưa đủ | Không thể vận hành ERP nếu không có logs/metrics/traces/alerts. | ✅ Prometheus/Grafana/Loki compose, `/status/metrics`, dashboard provisioning and SLO burn-rate alerts in `monitoring/prometheus/alerts.yml` with test; next: ship structured logs to Loki and native Prometheus metrics. | SRE/DevOps |
| GAP-ROLE-05 | Security program chưa có checklist liên tục | ERP chứa dữ liệu tài chính/khách hàng nhạy cảm. | ✅ CSP headers (API + Web), ✅ pnpm audit CI, ✅ threat model, ✅ ASVS Level 2 checklist, ✅ container image scan in CI; còn DLP review và field-level PII encryption. | Security |
| GAP-ROLE-06 | PWA/offline production gap | SME cần bán hàng/kho hoạt động khi mạng yếu. | ✅ Manifest/service worker/offline fallback/asset tests đã có; ✅ `docs/pwa/conflict-ux-matrix.md` + `pnpm audit:pwa-conflict-matrix` đã thêm; còn mở rộng entity type trong `SyncConflictModal` và populate diff thật. | Frontend/PWA |
| GAP-ROLE-07 | QA traceability và flakiness chưa được quản trị | Số lượng test cao nhưng cần biết test nào bảo vệ rủi ro nào. | ✅ Product traceability audit, role-readiness audit, and flaky quarantine policy/audit added; next: CI artifact/coverage reporting plan. | QA/SDET |
| GAP-ROLE-08 | Release/rollback chưa có playbook đầy đủ | Giảm downtime và rollback panic khi production lỗi. | ✅ Added `docs/runbooks/release-playbook.md`, `docs/runbooks/rollback-playbook.md` and CI job-level `API_KEY_HMAC_SECRET`; next: staging rollback drill. | Release Manager |
| GAP-ROLE-09 | Data governance/forecast monitoring thiếu | AI/forecast cần đo accuracy và bảo vệ PII. | Thêm data contract template, PII classification, forecast evaluation baseline. | Data/AI |
| GAP-ROLE-10 | Support/incident docs thiếu | Chủ repo/team support cần triage nhanh khi user báo lỗi. | ✅ Added `docs/runbooks/incident-runbook.md`, `docs/runbooks/support-triage-sop.md` and `docs/runbooks/troubleshooting-matrix.md`; `pnpm audit:troubleshooting-matrix` gate added. | Support + SRE |

## Recommended next PR sequence (Updated 2026-06-30)

1. **PR 1 — Product/QA traceability foundation**: ✅ PRD template, test traceability matrix và audit script đã thêm; tiếp theo mở rộng PRD theo module.
2. **PR 2 — Production readiness pack**: ✅ `docs/runbooks/*`, ADRs and SLO burn-rate alerts added; next: staging server and rollback drill.
3. **PR 3 — Security baseline**: ✅ CSP headers, ✅ pnpm audit CI, ✅ CodeQL SAST, ✅ container image scan, ✅ threat model, ✅ ASVS checklist; còn DLP review, field-level PII encryption.
4. **PR 4 — API governance**: ✅ global rate limiting, ✅ error code catalog, ✅ idempotency guard, ✅ migration rollback, ✅ pagination DTO; còn contract tests, outbox/saga pattern.
5. **PR 5 — PWA/offline hardening**: manifest/service worker, offline UX states và conflict-resolution test matrix.
6. **PR 6 — Engineering quality**: ✅ bundle analyzer, ✅ component test sample, ✅ cross-browser, ✅ load test CI; còn visual regression, accessibility, flaky policy.

## Definition of Done cho các gap mới

Một gap chỉ nên được đóng khi có đủ:

- Tài liệu yêu cầu hoặc ADR rõ ràng.
- Test tự động hoặc checklist kiểm chứng thủ công có owner.
- CI/quality gate liên quan nếu gap thuộc engineering/security/release.
- Người review theo vai trò liên quan được gắn trong PR.
- Cập nhật `GAPS.md`, release notes hoặc docs tương ứng.
