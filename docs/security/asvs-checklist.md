# OWASP ASVS Level 2 Checklist — Smart ERP Next

This checklist maps OWASP ASVS Level 2 requirements to project controls, tests and owners. It is a living document: controls are verified in CI where possible and reviewed during security-focused PRs.

## Legend

| Status | Meaning |
|---|---|
| ✅ | Control implemented and automatically or manually verified |
| 🔄 | Partially implemented or needs enhancement |
| ❌ | Not implemented yet |
| 📝 | Documented but not enforced by code/CI |

## V1 — Architecture, Design and Threat Modeling

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| V1.1 | Secure SDLC with threat modeling | 📝 | `docs/security/threat-model.md` |
| V1.2 | Security requirements defined per role | 📝 | This checklist and `docs/team-role-gap-assessment.md` |
| V1.4 | Secure-by-default configuration | ✅ | `EnvValidatorService` requires secrets; no hardcoded JWT fallback |
| V1.5 | Least privilege by default | ✅ | Role-based guards, tenant-scoped queries |

## V2 — Authentication

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| V2.1 | Strong password policy | ✅ | Password validation in auth service + tests |
| V2.2 | Secure password storage | ✅ | bcryptjs with salt rounds |
| V2.4 | Multi-factor authentication ready | 🔄 | `TotpService` exists; not enforced |
| V2.7 | Session timeout and rotation | ✅ | JWT 15m + refresh token 7d rotation |
| V2.10 | API key secure generation and storage | ✅ | HMAC-SHA512 with `API_KEY_HMAC_SECRET`, no SHA256 fallback |

## V3 — Session Management

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| V3.1 | Stateless session tokens | ✅ | JWT access/refresh tokens |
| V3.2 | Secure token transport | ✅ | HTTPS in production + `Secure` cookie policy expected |
| V3.3 | Token invalidation on logout | ✅ | Refresh token blacklist/rotation |

## V4 — Access Control

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| V4.1 | Enforced authorization | ✅ | `@Roles`, `@ApiKeyGuard`, tenant isolation |
| V4.2 | Principle of least privilege | 🔄 | Roles exist; per-module permission tests incomplete |
| V4.3 | Directory traversal prevention | ✅ | NestJS controllers, no file upload path traversal |

## V5 — Validation, Sanitization and Encoding

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| V5.1 | Input validation on all endpoints | 🔄 | DTOs + class-validator; not all endpoints covered |
| V5.2 | Output encoding | ✅ | `ResponseFormatInterceptor` returns JSON; CSP headers |
| V5.3 | Parameterized queries | ✅ | Drizzle ORM parameterized queries |
| V5.5 | Safe deserialization | ✅ | JSON only; no XML/YAML from untrusted sources |

## V6 — Stored Cryptography

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| V6.1 | Strong algorithms | ✅ | bcryptjs, HMAC-SHA512, JWT RS256/HS256 via env |
| V6.2 | Key management | 📝 | `secrets-management.md` recommendations |

## V7 — Error Handling and Logging

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| V7.1 | No sensitive data in errors | ✅ | `GlobalExceptionFilter` masks internal details |
| V7.2 | Structured logging | ✅ | `StructuredLogger` + request logging |
| V7.3 | Audit log for sensitive events | ✅ | `AuditLog` decorator + interceptor |
| V7.4 | Log integrity | ❌ | No log signing/immutable store yet |

## V8 — Data Protection

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| V8.1 | Classify sensitive data | 📝 | `docs/pii-classification.md` |
| V8.2 | Encryption at rest | ❌ | Relies on PostgreSQL/EBS; app-level encryption not implemented |
| V8.3 | Encryption in transit | ✅ | TLS termination in production |

## V9 — Communications

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| V9.1 | TLS configuration | 📝 | Production setup guide expects TLS |
| V9.2 | Security headers | ✅ | Helmet + CSP headers for API and web |

## V10 — Malicious Code

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| V10.1 | Dependency vulnerability scanning | ✅ | `pnpm audit --audit-level=high` + Trivy filesystem scan + Dependabot |
| V10.2 | Container image scanning | 🔄 | Filesystem scan done; image scan planned |
| V10.3 | Secret scanning | ✅ | `pnpm audit:secrets` in CI and commit gate |

## V11 — Business Logic

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| V11.1 | Business logic flow limits | ✅ | Rate limiting, idempotency keys, request timeouts |
| V11.2 | Anti-automation | ✅ | Global rate limiting + login rate limit |

## V12 — File and Resources

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| V12.1 | Safe file upload | 🔄 | Multer override to v2; file type/size checks need review |
| V12.2 | Resource exhaustion prevention | ✅ | Clamped forecast days, DB pool limits, request timeouts |

## V13 — API and Web Service

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| V13.1 | Generic security controls | ✅ | Helmet, CORS config, rate limiting |
| V13.2 | API schema validation | 🔄 | Swagger/OpenAPI partial; contract tests incomplete |
| V13.3 | API versioning | ✅ | Header-based `X-API-Version` with default v1 |

## V14 — Configuration

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| V14.1 | Build and deploy pipeline | ✅ | CI with type-check, lint, tests, audit, Trivy, CodeQL |
| V14.2 | Dependency pinning | ✅ | `pnpm-lock.yaml` + frozen lockfile in CI |
| V14.4 | No secrets in source | ✅ | Secret scanning gate |

## Next actions
1. Add container image scan to CI to close V10.2.
2. Complete per-module permission tests to close V4.2.
3. Add field-level encryption for high-sensitivity PII to close V8.2.
4. Add log integrity mechanism to close V7.4.
5. Expand API contract tests to close V13.2.
