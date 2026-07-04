# Support Triage SOP

## Purpose
Standardize how support requests, bug reports and user questions are received, triaged and routed to the right team.

## Channels

| Channel | Examples | First responder | SLA |
|---|---|---|---|
| GitHub Issues | Bugs, feature requests | QA/Engineering | 2 business days |
| Email/Chat | Urgent operational issues | On-call engineer | 4 hours |
| Phone/Emergency | SEV-1 outage | Incident Commander | 15 minutes |

## Triage steps

1. **Acknowledge**
   - Reply with ticket ID and expected next update time.

2. **Classify**
   - `bug` — reproducible defect
   - `feature` — new capability
   - `question` — how-to or clarification
   - `incident` — production outage or data issue

3. **Prioritize**
   - Blocker: affects revenue or compliance.
   - High: major feature degraded.
   - Medium: workaround exists.
   - Low: cosmetic or docs.

4. **Route**
   - `incident` → follow `incident-runbook.md` immediately.
   - `bug` → assign to module owner from `docs/ownership-matrix.md`.
   - `feature` → product backlog, tag `GAP-ROLE-01`.
   - `question` → update `docs/USER_GUIDE_VI.md` or FAQ.
- For known failure patterns, check `docs/runbooks/troubleshooting-matrix.md` first.

5. **Track**
   - Link GitHub issue to PR.
   - Update status labels: `triage`, `investigating`, `fixed`, `verified`.

6. **Close**
   - Verify fix with reporter.
   - Document root cause in issue if non-trivial.

## Information to collect from reporter

- Tenant/company name and user ID.
- Steps to reproduce.
- Screenshots or HAR file.
- Browser/mobile OS version.
- Time of incident.
- Error message or API error code.

## Escalation
- If the issue is not resolved within SLA, escalate to the domain owner.
- If it becomes a SEV-1/2, invoke the incident runbook.
