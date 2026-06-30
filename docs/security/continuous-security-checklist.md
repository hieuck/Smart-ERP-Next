# Continuous Security Checklist

This checklist closes the first automation slice of `GAP-ROLE-05`: every pull request must prove that no high-confidence secrets were committed before it can pass the commit gate.

## Required gates

| Gate | Command | Owner | Blocks |
|------|---------|-------|--------|
| Secret audit | `pnpm audit:secrets` | Security + DevOps | Commit and CI |
| Commit quality gate | `pnpm qa:commit` | Engineering | Commit and CI |
| Release quality gate | `pnpm qa:release` | Release Manager | Release certification |

## Secret audit scope

The audit scans files returned by `git ls-files` and ignores generated or dependency output such as `.git`, `node_modules`, `coverage`, `dist`, build folders, lockfiles, and TypeScript build-info files.

High-confidence patterns currently blocked:

- private key material
- AWS access key IDs
- GitHub tokens
- Slack tokens
- non-placeholder `JWT_SECRET` literals
- PostgreSQL URLs with non-placeholder inline passwords

## Rotation playbook when the gate fails

1. Stop the merge and identify the exact file and line reported by `pnpm audit:secrets`.
2. Revoke or rotate the exposed credential in the upstream provider before rewriting history.
3. Replace committed values with environment-variable references and update `.env.example` only with placeholders.
4. Re-run `pnpm audit:secrets` and `pnpm qa:commit`.
5. Document the incident in the release notes if the secret ever reached a shared branch.

## Completed

- ✅ CSP headers configured for API (`helmet`) and Web (`next.config.mjs` headers): default-src, script-src, style-src, img-src, connect-src, font-src, frame-src, object-src, base-uri
- ✅ Dependency vulnerability scanning (`pnpm audit --audit-level=high`) added to CI pipeline
- ✅ Global rate limiting via `@nestjs/throttler` in AppModule with env-controlled `GLOBAL_RATE_LIMIT`
- ✅ Removed unused native `bcrypt` dependency (only `bcryptjs` used)

## Future hardening backlog

- Expand the checklist into an ASVS control matrix for auth, tenant isolation, logging, and data export.
- Add container image scanning to the release workflow.
