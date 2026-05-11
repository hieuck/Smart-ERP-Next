# CLAUDE.md — Smart ERP Next

Behavioral guidelines for AI-assisted development on this project.

## 1. Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them.
- If a simpler approach exists, say so.
- If something is unclear, stop and name what's confusing.

## 2. Simplicity First

- Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.
- If you write 200 lines and it could be 50, rewrite it.

## 3. Surgical Changes

- Don't "improve" adjacent code, comments, or formatting.
- Match existing style, even if you'd do it differently.
- Remove imports/variables/functions that YOUR changes made unused.

## 4. Project Structure (CRITICAL)

```
smart-erp-next/
├── apps/
│   ├── api/          ← NestJS backend (src/ is at apps/api/src/)
│   ├── web/          ← Next.js frontend (src/ is at apps/web/src/)
│   ├── mobile/       ← Expo app (src/ is at apps/mobile/src/)
│   └── desktop/      ← Tauri app (src/ is at apps/desktop/src/)
├── packages/
│   ├── database/
│   ├── i18n/
│   ├── ui/
│   ├── shared/
│   ├── types/
│   ├── utils/
│   ├── hooks/
│   └── validation/
```

### ⚠️ NEVER create nested app directories or misplace app code in packages/

- **WRONG**: `apps/api/apps/api/src/...` — never nest an app inside itself
- **WRONG**: `apps/web/apps/desktop/...` — never nest one app inside another
- **WRONG**: `apps/web/app/...` — Next.js App Router lives at `apps/web/src/app/`
- **WRONG**: `packages/api/src/...` — NestJS backend code belongs in `apps/api/src/`, not `packages/`
- **RIGHT**: All source files for `api` go under `apps/api/src/`
- **RIGHT**: All source files for `web` go under `apps/web/src/`
- **RIGHT**: `packages/` is only for shared libraries consumed by multiple apps (ui, i18n, utils, types, hooks, validation, database, sync, shared)

If you find yourself writing a path like `apps/X/apps/...` or `packages/api/...`, **stop and fix the path**.

> This structure can be extended (new apps, new packages) — the rule is about **nesting**, not about limiting growth.

## 5. Project-Specific Rules

### Tech Stack

- **Monorepo**: pnpm + Turborepo
- **API**: NestJS 10, Drizzle ORM, PostgreSQL 14+
- **Web**: Next.js 15 App Router, Tailwind CSS, React 19
- **Mobile**: Expo 52, React Native 0.76, SecureStore
- **Desktop**: Tauri 2 (Rust)
- **i18n**: `@smart-erp/i18n` — always use `t('namespace.key')` pattern
- **Validation**: Zod (`@smart-erp/validation`) on frontend, class-validator on API

### i18n Rules

- All user-facing strings MUST use `useTranslation('common')` + `t('section.key')`
- Add keys to BOTH `vi/common.json` AND `en/common.json`
- Vietnamese is the default language (`fallbackLng: 'vi'`)
- Key pattern: `module.key` e.g. `products.title`, `orders.status`
- For mobile and desktop apps, import from `@smart-erp/i18n` – the same keys are shared across all platforms

### Encoding & File Format Rules (Critical for Vietnamese)

- **All source files MUST be saved as UTF-8 without BOM**. This ensures Vietnamese characters (ă, â, đ, ê, ô, ơ, ư, etc.) display correctly in all environments.
- **Use LF line endings** (not CRLF) for all source code files to avoid cross‑platform formatting issues.
- **Never hardcode user‑facing Vietnamese text** outside of i18n translation files (`packages/i18n/src/locales/vi/`). If you see Vietnamese characters in a component or service file, it should be using `t()`.
- When writing console logs or error messages in the backend, prefer English or use parameterized i18n messages.

### API Rules

- All service methods MUST filter by `tenantId` — never expose cross-tenant data
- Use `req.user.sub` for userId, `req.user.tenantId` for tenant (from JWT)
- Return `{ items, total, page, limit, totalPages }` for paginated endpoints
- Never return `passwordHash` in any response

### Web Rules

- All protected pages MUST wrap with `<AuthGuard>`
- Use `@/lib/api-client` (axios) for all API calls
- Use `useToast()` from `@/components/providers/ToastProvider` for feedback
- Use `@smart-erp/hooks` for `useDebounce`, `usePagination`, `useFormatters`
- Use `@smart-erp/utils` for pure formatting (no React dependency)

### Mobile Rules

- Use `apps/mobile/src/lib/api.ts` for all API calls (SecureStore auth)
- Use `SecureStoreTokenProvider` for sync service
- All screens must handle loading + empty + error states

### Commit Convention

```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scopes: api, web, mobile, desktop, db, i18n, ui, sync, types, validation, hooks, utils, docs
```

## 6. Goal-Driven Execution

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"

## 7. Internationalization (i18n) & Vietnamese Encoding

**CRITICAL FOR VIETNAMESE LANGUAGE SUPPORT**

- **NEVER hardcode Vietnamese text** anywhere in the codebase. Use i18n keys with `t('namespace.key')` in frontend and English in backend (API error responses are in English).
- **All source files must be UTF-8 without BOM** – Vietnamese characters (ă, â, đ, ê, ô, ơ, ư) will break otherwise.
- **Use LF line endings** (not CRLF) for all source files. Git normalizes on commit.
- **i18n keys follow dot notation**: `module.key.subkey` (e.g., `products.searchPlaceholder`).
- **Add new keys to both** `packages/i18n/src/locales/vi/common.json` **and** `en/common.json` simultaneously.
- **Backend exception messages:** use English; they may be displayed to frontend via alerts.

**Encoding check (Windows PowerShell):** `Get-Content -Encoding UTF8 <file>`
**Encoding check (Linux/macOS):** `file -bi <file>`

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and no hardcoded Vietnamese strings remain.
