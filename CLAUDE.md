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

## 4. Project-Specific Rules

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

## 5. Goal-Driven Execution

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication.
