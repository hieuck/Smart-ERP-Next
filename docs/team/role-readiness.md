# Real-Team Role Readiness Matrix

This matrix turns the role-based gap assessment into an operating model. Each row defines how a real product team should review, ship, and operate Smart ERP Next changes continuously.

| Role | RACI / accountability | Continuous-operation checklist | Evidence required before merge/release | Cadence |
|---|---|---|---|---|
| Product Manager | Accountable for user value, roadmap fit, and success metrics. | Confirms PRD, persona, KPI, rollout target, and support impact. | PRD row in `docs/product/prd-template.md`; Trace ID in `docs/product/test-traceability.md`; release-note impact. | Weekly backlog review; every feature PR. |
| Business Analyst / Domain SME | Accountable for Vietnam SME ERP process correctness. | Validates VAT/e-invoice, accounting, stock, payroll, and sales rules. | Business rule notes, acceptance criteria, and test traceability for affected module. | Per module change. |
| Engineering Manager | Accountable for ownership, capacity, and delivery risk. | Checks owner assignment, DoD, risk register, and unresolved blockers. | Updated `GAPS.md`, owner in docs, quality-gate result, remaining gap explicitly tracked. | Weekly delivery review; release readiness. |
| Solution Architect | Accountable for system boundaries and long-lived decisions. | Reviews ADR need, module boundaries, API compatibility, data consistency, and offline conflict strategy. | ADR or architecture note when boundary/API/data model changes. | Architecture review for high-risk PRs. |
| Backend Engineer | Accountable for API, domain services, persistence, and migrations. | Validates API contract, auth/RBAC, idempotency, pagination, migration/rollback, and service tests. | Unit/integration/contract test evidence and migration rollback note when applicable. | Every API/data PR. |
| Frontend Engineer | Accountable for web UX, accessibility, i18n, and client integration. | Validates loading/error states, i18n parity, a11y, API envelope handling, and design-system usage. | Component/E2E/a11y/i18n audit evidence for user-facing changes. | Every web PR. |
| Mobile/PWA Engineer | Accountable for installability, offline shell, sync, and device behavior. | Validates service worker, offline fallback, cache strategy, sync conflict UX, and device matrix. | PWA asset audit, E2E/offline test evidence, conflict-resolution note when applicable. | Every PWA/offline change. |
| QA Engineer / SDET | Accountable for risk-based test strategy and release confidence. | Maintains traceability, flaky-test policy, test ownership, and regression scope. | Passing targeted tests, traceability update, and clear manual validation if automation is not feasible. | Every PR; release test planning. |
| DevOps / Platform Engineer | Accountable for CI/CD, environments, secrets, and deployability. | Validates CI gates, Docker/runtime config, environment parity, secrets, and promotion path. | CI/quality-gate output, env parity/secrets audit, deployment notes. | Every infra/release PR. |
| SRE / Operations | Accountable for reliability, observability, incidents, and capacity. | Validates status/metrics/logging, alerts, SLO impact, backup/restore, and incident runbooks. | Observability evidence, alert/runbook update, smoke/load result when reliability risk changes. | Release readiness; incident review. |
| Security Engineer | Accountable for threat model, secure defaults, and compliance evidence. | Validates auth/RBAC, secrets, dependency/container scanning, CSP/security headers, audit logging, and PII handling. | Security audit output, threat/ASVS note for sensitive changes, permission tests. | Security review for high-risk PRs. |
| Data Engineer / Analytics | Accountable for data contracts, analytics quality, and forecast governance. | Validates schema/data contracts, lineage, reconciliation, forecast accuracy, drift, and PII classification. | Data contract or monitoring note plus tests for analytics/forecast changes. | Every data/forecast PR. |
| UX Researcher / Designer | Accountable for task usability, accessible flows, and localization quality. | Validates journey map, empty/error/loading states, copy, accessibility, and Vietnamese/English clarity. | UX checklist, screenshots when UI changes, a11y/manual notes for flows not covered by automation. | Design review before build; PR review for UX changes. |
| Technical Writer / Support | Accountable for user-facing docs, support triage, and troubleshooting. | Validates user guide, troubleshooting matrix, known issues, release notes, and support escalation path. | Docs update or explicit no-docs-needed note; support impact in release notes. | Every user-facing PR; release notes. |
| Release Manager | Accountable for release readiness, rollback, and sign-off orchestration. | Validates versioning, changelog, release candidate checklist, smoke tests, rollback criteria, and owner sign-off. | Release checklist, smoke evidence, rollback plan, unresolved gaps documented in `GAPS.md`. | Every release candidate. |

## Continuous-operation loop

1. Start with a PRD/Trace ID for product-impacting work.
2. Choose the accountable role owner and required reviewers from this matrix.
3. Write or update tests first for code changes; if automation is not feasible, record the manual evidence owner.
4. Run the smallest targeted gate locally, then the commit/release quality gate according to risk.
5. Update `GAPS.md` when a gap is closed or still blocked by infrastructure, credentials, or missing production traffic.
