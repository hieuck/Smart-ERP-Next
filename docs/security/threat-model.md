# Threat Model — Smart ERP Next

## Scope
This threat model covers the Smart ERP Next monorepo:
- `apps/api` — NestJS API (auth, business logic, data access)
- `apps/web` — Next.js web application (admin, POS, dashboards)
- `packages/database` — Drizzle ORM + PostgreSQL schema
- `packages/*` — shared business utilities
- CI/CD, Docker images and observability stack

## Threat actors

| Actor | Motivation | Capability |
|---|---|---|
| External attacker (unauthenticated) | Steal data, disrupt service, fraud | Low-to-medium |
| Malicious insider (employee/tenant admin) | Exfiltrate tenant/customer data | Medium-to-high |
| Compromised dependency | Supply-chain attack | Varies |
| Automated scanner / bot | Mass credential stuffing | Low |

## High-level data flow

```text
User/Browser → Next.js web → NestJS API → Drizzle ORM → PostgreSQL
                    ↓              ↓
               Static assets   JWT validation
                                 Rate limiting
                                 API key validation
                                 Audit logging
```

## STRIDE analysis

### Spoofing
- **Threat**: Attacker impersonates a user or tenant.
- **Controls**: JWT access/refresh tokens, Argon2/bcrypt password hashing, API keys via HMAC-SHA512, tenant-scoped queries.
- **Gaps**: MFA not yet enforced; 2FA/TOTP foundation exists but not required.

### Tampering
- **Threat**: Modify data in transit or at rest.
- **Controls**: TLS in production, request-id propagation, idempotency keys for orders/payments, audit logs.
- **Gaps**: No signed webhooks yet; row-level change signatures not implemented.

### Repudiation
- **Threat**: User denies performing an action.
- **Controls**: AuditLog decorator on sensitive operations, structured request logging, `scheduler_log` table.
- **Gaps**: Audit log retention policy and export not defined.

### Information disclosure
- **Threat**: Leak PII, financial data or credentials.
- **Controls**: CSP headers, helmet, response envelope, env validation, secret scanning, DB pool env vars.
- **Gaps**: Field-level encryption for PII not implemented; DLP review not formalized.

### Denial of service
- **Threat**: Exhaust API/database resources.
- **Controls**: Global rate limiting, request timeout middleware, forecast days clamping, DB pool limits, Playwright load tests.
- **Gaps**: Per-tenant rate limiting not implemented; WAF rules not documented.

### Elevation of privilege
- **Threat**: Low-privilege user gains admin access.
- **Controls**: Role-based guards, API key guard, tenant isolation in queries.
- **Gaps**: Permission matrix tests incomplete for some modules.

## Risk register

| ID | Threat | Severity | Likelihood | Status |
|---|---|---|---|---|
| T1 | Credential stuffing against login | High | Medium | Mitigated by rate limiting; monitor for spikes |
| T2 | JWT secret compromise | Critical | Low | Mitigated by env-only secret + validation |
| T3 | Dependency vulnerability (npm) | High | Medium | Mitigated by pnpm audit + Trivy + Dependabot |
| T4 | Container image vulnerability | High | Medium | Partial — filesystem scan done; image scan planned |
| T5 | Insider data exfiltration | High | Medium | Partial — tenant scoping + audit logs |
| T6 | Unpatched base image | High | Medium | Mitigated by alpine base; add image scan |

## Action items
1. Add container image scan to CI (Trivy image scan).
2. Document ASVS checklist and map controls to code/tests.
3. Define audit log retention and export policy.
4. Evaluate field-level encryption for PII fields.
5. Add per-tenant rate limiting after traffic baseline exists.
