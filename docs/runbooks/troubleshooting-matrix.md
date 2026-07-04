# Troubleshooting Matrix

Quick lookup for common failures observed during local development, CI, Docker, and production operations.

## How to use this matrix

1. Find the symptom closest to what you see.
2. Check the probable cause and quick fix.
3. If the quick fix does not work, follow the diagnostic commands and escalate to the owner listed.

| ID | Area | Symptom | Probable cause | Quick fix | Diagnostic commands | Owner | Escalation |
|---|---|---|---|---|---|---|---|
| TM-01 | Build | `Type error: Cannot find module '@smart-erp/...'` | Package not compiled or workspace symlink missing | Run `pnpm install --frozen-lockfile && pnpm -r build` | `pnpm --filter @smart-erp/api type-check` | Backend lead | Architecture if circular dependency |
| TM-02 | Build | `docker build` fails at `pnpm install` with lockfile mismatch | Lockfile out of sync with `package.json` | Run `pnpm install --no-frozen-lockfile` locally, commit `pnpm-lock.yaml` | `git diff pnpm-lock.yaml` | DevOps | Release manager if release branch |
| TM-03 | DB | `DATABASE_URL` error on startup | Missing or malformed connection string | Check `apps/api/.env` matches `.env.example`; verify `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | `pnpm --filter @smart-erp/db migrate` | SRE | Data engineer |
| TM-04 | DB | Migration fails with `relation does not exist` | Migration run out of order or missing baseline | Run `pnpm db:rollback` to last known good, then re-apply | `drizzle-kit migrate --config packages/database/drizzle.config.ts` | Backend lead | Data engineer |
| TM-05 | E2E | Flaky failure in `05-ui-enduser-release.spec.ts` on `consoleErrors.length` | Browser console errors from third-party assets or race condition | Re-run failed job; check screenshots and trace | `pnpm exec playwright show-trace test-results/.../trace.zip` | QA/SDET | Frontend if reproducible locally |
| TM-06 | E2E | `page.goto` times out in CI | API server not ready before Playwright starts | Check health endpoint in CI logs; increase start timeout if needed | `curl -H "X-API-Version: 1" http://localhost:3456/health` | DevOps | SRE |
| TM-07 | Auth | Login returns `401 Unauthorized` after reset | Wrong `JWT_SECRET` or token expired | Verify env `JWT_SECRET` matches across API and E2E; regenerate tokens | `pnpm --filter @smart-erp/api test auth` | Security | Backend |
| TM-08 | Auth | API key validation fails after PR #49 | Legacy SHA256 key not supported; `API_KEY_HMAC_SECRET` missing | Generate new API key via UI or set `API_KEY_HMAC_SECRET` env var | `pnpm --filter @smart-erp/api test api-keys` | Security | Backend |
| TM-09 | Docker | Container exits immediately with `postgres: ...` | Embedded PostgreSQL data dir permission issue | Remove volume or run with `--user postgres`; for demo use `docker-compose.prod.yml` instead | `docker logs <container>` | DevOps | SRE |
| TM-10 | Docker | Image size > 2 GB | Runtime stage copies full `node_modules` | Expected for self-contained demo; use multi-container compose for production | `docker images smart-erp-next:test` | SRE | Architect |
| TM-11 | CI | `pnpm audit --audit-level=high` fails | New HIGH/CRITICAL advisory in dependency tree | Run `pnpm audit --audit-level=high`; apply override or upgrade; do not silence without fix | `pnpm why <package>` | Security | DevOps |
| TM-12 | CI | `container-scan` job fails on HIGH/CRITICAL | Base image (e.g., `postgres:16-alpine`) contains OS/static binary CVEs | Image is detect-only in CI; SARIF is uploaded to Security tab. Upgrade base image when upstream patch is available. Do not ignore without risk note. | `trivy image --severity HIGH,CRITICAL smart-erp-next:test` | SRE | Security |
| TM-13 | CI | Two CodeQL checks appear on PR | GitHub default CodeQL setup is enabled; no custom `codeql.yml` exists since PR #45 | This is expected. Default setup runs `Analyze (javascript-typescript)`. The separate `CodeQL` check is the combined result. See `docs/security/codeql-setup.md`. | `gh pr checks <pr>` | SRE | Security |
| TM-14 | Secrets | `git commit` rejected by `audit:secrets` | Detected high-entropy string or known pattern in staged file | Check `.trufflehogignore` or `scripts/audit-secrets.js`; move secrets to env files (not committed) | `pnpm audit:secrets` | Security | DevOps |
| TM-15 | Performance | `/health` slower than 1 s | DB pool exhausted or slow query | Check `DB_POOL_MAX`, enable slow query logs, review recent migrations | `pnpm --filter @smart-erp/api test health` | Backend | SRE |
| TM-16 | Release | `release.yml` draft not created | Missing `GH_PAT` or `GITHUB_TOKEN` permission | Ensure workflow has `contents: write` and token has permission to create releases | `gh release list` | Release manager | DevOps |

## Diagnostic recipes

### Full local reset

```bash
# Reset DB, install deps, build, run tests
pnpm install --frozen-lockfile
pnpm --filter @smart-erp/db db:reset
pnpm -r build
pnpm test
```

### Inspect failed E2E trace

```bash
pnpm exec playwright show-trace e2e/test-results/<test-name>/trace.zip
```

### Check for duplicate GitHub Actions workflows

```bash
ls .github/workflows/
gh workflow list
```

## Adding a new row

1. Pick the next `TM-NN` ID.
2. Include symptom, cause, quick fix, diagnostic command, owner, and escalation path.
3. Run `pnpm audit:troubleshooting-matrix` to validate required sections are present.

## References

- `docs/runbooks/support-triage-sop.md` — how support tickets are routed.
- `docs/runbooks/incident-runbook.md` — when a symptom becomes an incident.
- `docs/ownership-matrix.md` — module owners for routing.
- `docs/security/codeql-setup.md` — why CodeQL default setup appears as multiple checks.
