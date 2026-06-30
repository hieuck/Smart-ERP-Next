# Module Ownership Matrix

| Module | Primary Owner | Secondary | Domain |
|--------|-------------|-----------|-------|
| Auth / Users / Tenants | Backend | Security | Core |
| Products / Inventory | Backend | Data | Commerce |
| Orders / POS | Backend | Frontend | Commerce |
| Customers / CRM | Backend | Frontend | Commerce |
| Suppliers / Purchasing | Backend | Data | SCM |
| Accounting / E-Invoice | Backend | Domain SME | Finance |
| HR / Payroll / Attendance | Backend | Domain SME | HR |
| Manufacturing / MRP / QMS | Backend | Data | Production |
| Reports / Insights / Analytics | Backend | Data | BI |
| Forecast / AI | Data/AI | Backend | Intelligence |
| Approvals / Automation | Backend | QA | Infra |
| Web (Next.js) | Frontend | UX | Presentation |
| E2E Tests | QA | Backend | Quality |
| CI/CD / Docker | DevOps | Backend | Platform |
| Security / Compliance | Security | Backend | Platform |

## Definition of Done

A feature/bugfix is done when:

1. **Code**: Reviewed and merged to `dev`
2. **Tests**: Unit/integration tests cover the change (coverage threshold met)
3. **E2E**: Critical path tested via Playwright
4. **Docs**: API docs updated if endpoint changed
5. **No regressions**: All existing tests pass
6. **QA sign-off**: For UI changes, QA verified on staging

## Engineering KPIs

| Metric | Target | How to measure |
|--------|--------|---------------|
| Deployment frequency | Weekly | GitHub releases |
| Lead time (commit to prod) | < 2 days | Time from merge to release tag |
| Test pass rate | 100% on `dev` | CI pipeline |
| Coverage | ≥ 89% | `pnpm test:cov` |
| E2E pass rate | ≥ 95% | Playwright report |
