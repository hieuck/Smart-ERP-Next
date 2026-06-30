# Backup Scheduling

## Overview

Automated database backups protect against data loss. This guide covers scheduling backups via cron (Linux) or Task Scheduler (Windows).

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/backup.sh` | Full database backup |
| `scripts/backup-db.sh` | Database-only backup |
| `scripts/verify-backup.js` | Backup file validation + restore verification |

## Linux: cron

```bash
# Edit crontab
crontab -e

# Daily backup at 2:00 AM, keep 7 days
0 2 * * * /path/to/smart-erp-next/scripts/backup.sh >> /var/log/smart-erp-backup.log 2>&1

# Weekly verification on Sunday at 3:00 AM
0 3 * * 7 /usr/bin/node /path/to/smart-erp-next/scripts/verify-backup.js /path/to/backups/latest.sql
```

## Linux: systemd timer

```ini
# /etc/systemd/system/smart-erp-backup.service
[Unit]
Description=Smart ERP Database Backup

[Service]
Type=oneshot
ExecStart=/path/to/smart-erp-next/scripts/backup.sh
Environment=DATABASE_URL=postgresql://user:pass@localhost:5432/smart_erp
```

```ini
# /etc/systemd/system/smart-erp-backup.timer
[Unit]
Description=Daily Smart ERP Backup

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

## Retention policy

- Daily backups: keep 7 days
- Weekly backups: keep 4 weeks
- Monthly backups: keep 12 months

## Recovery test

Run `scripts/verify-backup.js` weekly to ensure backups are valid.
