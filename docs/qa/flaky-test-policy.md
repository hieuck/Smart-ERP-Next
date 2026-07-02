# Flaky Test Policy

Smart ERP Next treats flaky tests as release risk, not harmless noise. This policy gives QA/SDET, Engineering Manager, DevOps, SRE, and Release Manager a shared operating rule for autonomous execution and continuous operation.

## Rules

1. Committed `test.only`, `it.only`, or `describe.only` is never allowed.
2. `test.skip`, `it.skip`, or `describe.skip` must be one of:
   - a **prerequisite skip** with a clear reason beginning with `Prerequisite`; or
   - an owned quarantine reason using `QUARANTINE owner=@<role-or-person> expires=<YYYY-MM-DD> issue=<ticket-or-url>: <reason>`.
3. Quarantines must be time-boxed and reviewed before release certification.
4. Product/QA traceability rows must not point only to quarantined evidence.
5. Release Manager must keep unresolved quarantines visible in `GAPS.md` or release notes when they affect production confidence.

## Examples

```ts
test.skip(!roleId, 'Prerequisite role creation failed; delete test has no role to delete');

test.skip(browserName === 'webkit', 'QUARANTINE owner=@qa expires=2026-08-01 issue=#123: upstream browser sandbox is flaky');
```

## Role responsibilities

| Role | Responsibility |
|---|---|
| QA Engineer / SDET | Owns triage, quarantine format, and follow-up verification. |
| Engineering Manager | Ensures quarantines have owners and do not become hidden backlog. |
| DevOps / Platform Engineer | Confirms CI surfaces quarantine failures and artifacts. |
| SRE / Operations | Reviews release risk if quarantined tests cover reliability flows. |
| Release Manager | Blocks release certification if a critical Trace ID depends only on quarantined evidence. |
