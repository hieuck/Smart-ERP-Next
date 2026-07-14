# Smart ERP Next QA Gates

## Rule

`100%` Jest coverage is only a unit/integration coverage result for the current Jest configuration. It is not release certification.

Do not report Smart ERP Next as `100% complete`, `release-ready`, or `enterprise passed` unless the release gate passes in the same working session.

## Commands

```bash
pnpm qa:commit
```

Runs the commit gate:

- lint all workspaces
- runtime i18n key and encoding audit
- Vietnamese/English locale parity audit
- committed secret audit
- type-check all workspaces
- Jest unit/integration tests with configured coverage thresholds

This gate allows a commit, but it is not enough to claim release readiness.

```bash
pnpm qa:release
```

Runs the release gate:

- all commit gates
- web build
- web production build artifact verification
- native Windows desktop build
- mobile native type-check
- e2e assertion audit that blocks `401`, `404`, and `500` as accepted success states
- API end-to-end tests
- Playwright end-user web flows
- native artifact verification for Android, iOS, and Windows

If APK, IPA, or Windows installable artifacts are missing, release certification must fail.

## Release Workflow

`.github/workflows/release.yml` runs `pnpm qa:release` as a required job before any Docker image is built or any GitHub Release is created. The `docker-images` and `create-release` jobs declare `needs: qa-release`, so a tag push cannot bypass the release certification gate.

The web production build artifact verification blocks `.next` outputs that still contain development manifests, `isDev=true` server bundles, or server chunks that reference missing files. This catches the `next start` runtime class of failures where a stale dev `.next` artifact crashes with missing `vendor-chunks/*` modules.

Web development uses `.next-dev` through `pnpm --filter @smart-erp/web dev`, while production build/start uses `.next`. This prevents a running `next dev` process from overwriting production build artifacts during local release checks.

## Test Directory Map

Jest/unit coverage is intentionally separate from browser and native journey tests.

- `apps/**/src/**/*.spec.ts`, `packages/**/__tests__`, and `scripts/__tests__`: run by `pnpm test:cov`.
- `apps/api/test`: API end-to-end tests run by `pnpm test:api:e2e`.
- `e2e/tests`: Playwright release web flows run by `pnpm test:e2e`.
- `apps/mobile/e2e` and `apps/desktop/tests`: app-local journey tests.

The i18n parity audit is documented in `docs/i18n-parity.md` and runs in both CI and `pnpm qa:commit`.

The committed secret audit is documented in `docs/security/continuous-security-checklist.md` and runs in both CI and `pnpm qa:commit`.

The e2e assertion audit scans every end-user/app-local root above: `apps/api/test`, `apps/desktop/tests`, `apps/mobile/e2e`, and `e2e/tests`.

`pnpm test:cov` ignores `/tests/`, `/e2e/`, and `apps/desktop/tests`, so a Jest coverage percentage must not be read as proof that browser or native journeys passed.

API test directory ownership is enforced by `pnpm audit:test-layout`:

- `apps/api/test` is reserved for Nest API e2e specs named `*.e2e-spec.ts` plus approved e2e helper files.
- API unit/integration specs belong under `apps/api/src`, either colocated as `*.spec.ts` or inside `apps/api/src/__tests__`.
- Root-level `apps/api/tests` and `apps/api/__tests__` are blocked because they do not map cleanly to one runner.

## Native Artifacts

The native artifact gate searches these locations:

- `artifacts`
- `dist`
- `apps/mobile`
- `apps/desktop/src-tauri/target/release/bundle`

Required artifact types:

- Android: `.apk` or `.aab`
- iOS: `.ipa`
- Windows: `.msi` or `.exe`

Passing unit coverage without these artifacts is not a valid release claim.

## Git Hook

The tracked hook template is `.githooks/pre-commit`. The local `.git/hooks/pre-commit` in this workspace has also been updated to call `pnpm qa:commit`.

To use the tracked hook path in a fresh clone:

```bash
git config core.hooksPath .githooks
```
