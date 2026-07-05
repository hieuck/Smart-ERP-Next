# Data Contract Template

Use this template before changing analytics, forecast, export, sync, or reporting data. Each contract should live next to the owning module documentation or in `docs/data-contracts/` when the data set is shared across modules.

## Contract metadata

| Field              | Required value                                              |
| ------------------ | ----------------------------------------------------------- |
| Contract ID        | `DATA-<module>-<dataset>-v<major>`                          |
| Owner              | Data Engineer / module owner                                |
| Business owner     | PM or Business Analyst accountable for the metric/process   |
| Source system      | API/service/table/event that produces the data              |
| Consumers          | Reports, dashboards, forecast jobs, integrations, exports   |
| Refresh cadence    | Real time, hourly, daily, or on demand                      |
| Retention          | Retention period and archival path                          |
| PII classification | Link to `docs/pii-classification.md` category               |
| Change policy      | Backward-compatible, deprecation window, or breaking change |

## Schema

| Field        | Type   | Nullable | Description                 | Validation rule                  | PII class |
| ------------ | ------ | -------: | --------------------------- | -------------------------------- | --------- |
| `example_id` | string |       No | Stable business identifier. | Non-empty, unique within source. | Public    |

## Quality checks

- Freshness SLA: maximum accepted delay before an alert or support escalation.
- Completeness: required row/count reconciliation against the source module.
- Accuracy: business rules or formulas used to compute derived fields.
- Uniqueness: natural key or deduplication rule.
- Drift: threshold for unexpected distribution changes in forecast/analytics fields.

## Operational evidence

- Automated tests or audit scripts that protect this contract.
- Dashboard, report, or runbook link used by support/SRE.
- Rollback/deprecation plan for breaking schema or semantic changes.
- Manual validation owner when automation is not feasible.

## Example sign-off

| Role                          | Sign-off evidence                                            |
| ----------------------------- | ------------------------------------------------------------ |
| Product Manager               | KPI/report still answers the intended business question.     |
| Business Analyst / Domain SME | Domain formulas and reconciliation rules are correct.        |
| Data Engineer / Analytics     | Schema, quality checks, PII class, and lineage are complete. |
| QA Engineer / SDET            | Tests or manual validation evidence are attached.            |
| Security Engineer             | Sensitive fields follow PII handling requirements.           |
