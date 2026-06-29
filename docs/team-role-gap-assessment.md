# Team Role Gap Assessment — 2026-06-29

Mục tiêu của tài liệu này là review Smart ERP Next như một team phát triển sản phẩm thật, tách theo từng vai trò để chủ repo có thể ưu tiên backlog/PR tiếp theo. Đánh giá dựa trên cấu trúc repo hiện tại, tài liệu, CI/CD, test suite và các script vận hành có sẵn trong repository.

## Executive summary

Smart ERP Next đã có nền tảng mạnh cho một ERP SME: monorepo rõ ràng, API NestJS, web Next.js, shared packages, Drizzle/PostgreSQL, test unit/integration/E2E, Docker và CI. Tuy nhiên, để vận hành như một team production thực thụ, repo còn thiếu các artefact quản trị sản phẩm, release, bảo mật, vận hành và QA định lượng. Các gap quan trọng nhất là:

1. **Product/Business**: chưa có product requirements, acceptance criteria theo persona và KPI thành công cho từng module ERP.
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
| Product Manager | README mô tả module và quick start; roadmap/gaps tồn tại. | Bổ sung PRD/module charter cho Sales, Inventory, Accounting, HR; thêm metric success như activation, task completion, time-to-invoice; định nghĩa acceptance criteria theo persona. | High |
| Business Analyst / Domain SME | Có nhiều module ERP và docs hướng dẫn module. | Cần mapping nghiệp vụ chuẩn Việt Nam: VAT/e-invoice, kế toán, tồn kho, lương; thêm glossary domain và business rules traceability từ yêu cầu → test. | High |
| Engineering Manager | Monorepo và scripts dev/CI đã tương đối rõ. | Cần ownership matrix, Definition of Done theo loại thay đổi, release calendar, module risk register và capacity planning cho debt/domain refactor. | Medium |
| Solution Architect | Kiến trúc apps/packages rõ: API, web, database, shared, sync, accounting. | Domain modules còn phẳng; cần ADRs cho API versioning, multi-tenant isolation, eventing/webhook reliability, offline conflict strategy và boundaries giữa packages. | High |
| Backend Engineer | NestJS API lớn, nhiều services/controllers/tests. | Chuẩn hóa API versioning, contract tests, idempotency cho order/payment/inventory, migration rollback, pagination/filtering spec và error catalog công khai. | High |
| Frontend Engineer | Next.js web app, shared UI, hooks, localization. | Cần design system governance, accessibility gate, route-level loading/error UX, PWA manifest/service worker, visual regression tests và offline UX checklist. | High |
| Mobile/PWA Engineer | Repo có nền sync/offline và web app PWA-ready. | Thiếu manifest/service worker production, install prompt, offline cache strategy, background sync UX và device matrix. | Medium |
| QA Engineer / SDET | Có Jest, Playwright, E2E, audit scripts và quality gate. | Cần test plan theo risk, flaky test policy, coverage dashboard thật trong CI, contract/API schema tests, synthetic smoke theo môi trường và traceability matrix. | High |
| DevOps / Platform Engineer | Có Docker, compose prod, CI, release workflow và deploy scripts. | Cần staging server thực, IaC, environment promotion, SBOM/container scan, rollback release playbook, secrets rotation và artifact provenance. | High |
| SRE / Operations | Có status API, health-check scripts, backup scripts. | Cần metrics/logs/traces stack, alerts, SLO/SLA, incident runbook, backup restore drill, load test baseline và capacity plan. | High |
| Security Engineer | Đã xử lý một số P0 như JWT secret, Helmet, auth guards. | Cần threat model, OWASP ASVS checklist, SAST/DAST/dependency scan, secret scanning, audit log retention, rate-limit policy theo endpoint và permission test matrix. | High |
| Data Engineer / Analytics | Có forecast docs, analytics/reports E2E và database package. | Cần data contracts, warehouse/export strategy, event naming, reconciliation reports, forecast accuracy monitoring và PII classification. | Medium |
| UX Researcher / Designer | User guide và flows hiện diện. | Cần usability test script, role-based journey maps, accessibility review, empty/error/loading state inventory và localization review cho tiếng Việt/English. | Medium |
| Technical Writer / Support | Docs user/dev/API/production có sẵn. | Cần docs information architecture, release notes template cho non-technical users, troubleshooting matrix, support triage SOP và onboarding checklist theo role. | Medium |
| Release Manager | Có release workflow và release notes generator. | Cần semantic versioning policy, changelog governance, release candidate checklist, rollback criteria và production readiness review. | Medium |

## Gap backlog đề xuất cho chủ repo

| ID | Gap | Why it matters | Suggested PR scope | Owner role |
|---|---|---|---|---|
| GAP-ROLE-01 | Product requirements chưa truy vết tới tests | Giảm rủi ro build sai nghiệp vụ ERP. | Thêm `docs/product/` với PRD template, persona, acceptance criteria và link tới E2E tương ứng. | PM + BA + QA |
| GAP-ROLE-02 | Thiếu ADR cho quyết định kiến trúc lớn | Giúp team mới hiểu trade-off và tránh refactor cảm tính. | Thêm `docs/adr/0001-record-architecture-decisions.md` và ADR cho API versioning/domain boundaries. | Architect |
| GAP-ROLE-03 | API versioning/error catalog chưa chuẩn hóa | Bảo vệ backward compatibility cho web/mobile/integration partners. | Viết `docs/api-versioning.md`, `docs/api-errors.md`, thêm contract test skeleton. | Backend |
| GAP-ROLE-04 | Observability production chưa đủ | Không thể vận hành ERP nếu không có logs/metrics/traces/alerts. | Thêm observability plan, Prometheus/Grafana/Loki compose mẫu, alert rules và SLO doc. | SRE/DevOps |
| GAP-ROLE-05 | Security program chưa có checklist liên tục | ERP chứa dữ liệu tài chính/khách hàng nhạy cảm. | Thêm threat model, ASVS checklist, dependency/container scan CI job, secret scanning policy. | Security |
| GAP-ROLE-06 | PWA/offline production gap | SME cần bán hàng/kho hoạt động khi mạng yếu. | Thêm manifest/service worker plan, offline UX checklist, conflict test matrix. | Frontend/PWA |
| GAP-ROLE-07 | QA traceability và flakiness chưa được quản trị | Số lượng test cao nhưng cần biết test nào bảo vệ rủi ro nào. | Thêm risk-based test matrix, flaky test policy, CI artifact/coverage reporting plan. | QA/SDET |
| GAP-ROLE-08 | Release/rollback chưa có playbook đầy đủ | Giảm downtime và rollback panic khi production lỗi. | Thêm release checklist, rollback decision tree, smoke tests sau deploy và owner sign-off. | Release Manager |
| GAP-ROLE-09 | Data governance/forecast monitoring thiếu | AI/forecast cần đo accuracy và bảo vệ PII. | Thêm data contract template, PII classification, forecast evaluation baseline. | Data/AI |
| GAP-ROLE-10 | Support/incident docs thiếu | Chủ repo/team support cần triage nhanh khi user báo lỗi. | Thêm incident runbook, support triage SOP và troubleshooting matrix. | Support + SRE |

## Recommended next PR sequence

1. **PR 1 — Product/QA traceability foundation**: thêm PRD template, test traceability matrix và module ownership.
2. **PR 2 — Production readiness pack**: observability plan, release/rollback playbook, SLOs và incident runbook.
3. **PR 3 — Security baseline**: threat model, ASVS checklist, dependency/container/secret scanning.
4. **PR 4 — API governance**: versioning, error catalog, contract tests và deprecation policy.
5. **PR 5 — PWA/offline hardening**: manifest/service worker, offline UX states và conflict-resolution test matrix.

## Definition of Done cho các gap mới

Một gap chỉ nên được đóng khi có đủ:

- Tài liệu yêu cầu hoặc ADR rõ ràng.
- Test tự động hoặc checklist kiểm chứng thủ công có owner.
- CI/quality gate liên quan nếu gap thuộc engineering/security/release.
- Người review theo vai trò liên quan được gắn trong PR.
- Cập nhật `GAPS.md`, release notes hoặc docs tương ứng.
