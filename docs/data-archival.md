# Data Archival Strategy

## Why archive

ERP transaction tables grow over time. Archiving improves query performance and reduces backup size.

## Archival targets

| Table | Retention | Archival method | Automation |
|-------|-----------|----------------|------------|
| activity_logs | 90 days | DELETE via scheduled task | ✅ Daily cron |
| outbox_events | 30 days | DELETE via OutboxService.cleanup() | Manual |
| inventory_transactions | 1 year | Partition by month, DROP old partitions | Manual |
| orders + order_items | 2 years | Export to cold storage (S3/Blob), then soft-delete | Manual |
| notifications | 90 days | DELETE via scheduled task | ✅ Daily cron |
| refresh_tokens | 30 days | DELETE expired tokens on refresh | ✅ On refresh |

## Cold storage format

Archived data should be exported as:
- JSON Lines (`.jsonl`) for schemaless access
- SQL dump for full restore capability

## Implementation

For large-scale archival, use partition-based archiving:

```sql
-- Example: partition activity_logs by month
CREATE TABLE activity_logs_2026_01 PARTITION OF activity_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

Run archival during low-traffic hours. Monitor disk space before and after.
