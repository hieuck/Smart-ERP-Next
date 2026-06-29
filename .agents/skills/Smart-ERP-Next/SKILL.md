```markdown
# Smart-ERP-Next Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill provides a comprehensive guide to the development patterns, coding conventions, and workflows used in the Smart-ERP-Next JavaScript codebase. It covers file naming, import/export styles, testing strategies, and detailed instructions for maintaining quality gates, observability, internationalization (i18n), and PWA features. Use this as a reference for contributing to or maintaining the repository.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `apiVersioning.js`, `statusController.js`

### Import Style
- Use **alias imports** for modules.
  - Example:
    ```javascript
    import { getStatus } from '@api/monitor/status.service';
    ```

### Export Style
- Use **named exports**.
  - Example:
    ```javascript
    // status.service.js
    export function getStatus() { ... }
    export function checkHealth() { ... }
    ```

### Commit Patterns
- Commit messages are freeform, often without strict prefixes.
- Average commit message length: ~47 characters.

## Workflows

### Add Quality Gate and Observability Workflow
**Trigger:** When introducing or updating cross-cutting quality, monitoring, internationalization, or PWA offline features.
**Command:** `/add-quality-gate`

Follow these steps to add or update quality gates, observability, i18n parity, PWA offline runtime, and related documentation/scripts:

1. **Update CI Workflow**
   - Edit `.github/workflows/ci.yml` to add or update CI steps for quality checks and monitoring.

2. **Update GAPS Documentation**
   - Modify `GAPS.md` to reflect new or resolved gaps in quality, monitoring, or i18n.

3. **Implement/Update API Versioning & Monitoring**
   - Update or add logic in:
     - `apps/api/src/common/api-versioning.ts`
     - `apps/api/src/monitor/status.controller.ts`
     - `apps/api/src/monitor/status.service.ts`
   - Add or update related tests:
     - `apps/api/src/common/api-versioning.spec.ts`
     - `apps/api/src/monitor/status.service.spec.ts`

4. **Update/Add PWA and i18n Files**
   - For PWA:
     - `apps/web/public/manifest.json`
     - `apps/web/public/offline.html`
     - `apps/web/public/sw.js`
     - `apps/web/src/components/providers/ServiceWorkerProvider.tsx`
   - For i18n:
     - `apps/web/src/lib/locales/en/common.json`
     - `apps/web/src/lib/locales/vi/common.json`
     - `apps/web/src/app/layout.tsx`

5. **Update Documentation**
   - Add or update docs in `docs/`:
     - `api-errors.md`, `api-versioning.md`, `i18n-parity.md`, `observability.md`, `pwa-offline.md`, `qa-gates.md`
     - Security and team gap docs as needed

6. **Update/Add Monitoring Configurations**
   - Edit or add files in:
     - `monitoring/grafana/`
     - `monitoring/loki/`
     - `monitoring/prometheus/`
     - `docker-compose.observability.yml`

7. **Add/Update Audit and Quality Scripts**
   - Scripts and tests in:
     - `scripts/`
     - `scripts/__tests__/`

8. **Update package.json**
   - Add new scripts or dependencies as needed.

**Example: Adding a new audit script**
```javascript
// scripts/audit-i18n-parity.js
export function auditI18nParity() {
  // Logic to check i18n completeness
}
```
```javascript
// scripts/__tests__/audit-i18n-parity.test.js
import { auditI18nParity } from '../audit-i18n-parity';

test('should detect missing i18n keys', () => {
  expect(auditI18nParity()).toBe(true);
});
```

## Testing Patterns

- **Framework:** [jest](https://jestjs.io/)
- **Test file pattern:** Files end with `.test.js`
  - Example: `audit-i18n-parity.test.js`
- **Test Example:**
  ```javascript
  import { checkHealth } from './status.service';

  test('should return healthy status', () => {
    expect(checkHealth()).toBe('healthy');
  });
  ```

## Commands

| Command            | Purpose                                                                 |
|--------------------|-------------------------------------------------------------------------|
| /add-quality-gate  | Initiate or update quality gates, observability, i18n, and PWA features |

```