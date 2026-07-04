# PWA Offline Conflict UX Matrix

Smart ERP Next supports offline reads and deferred writes for core sales/inventory flows. This matrix defines the expected user experience when a local change conflicts with a remote change that arrived while the device was offline.

## Conflict scenarios by business flow

| ID | Flow | Offline action | Remote change | Conflict type | UX pattern | Default | User control | i18n key |
|---|---|---|---|---|---|---|---|---|
| CF-01 | POS sale | Create order while offline | Same product stock reduced by another POS/channel | Stock availability changed before sync | Inline warning + keep local order + flag inventory variance | Keep local order | Cashier can adjust quantity or cancel line before sync | `sync.conflictOrderStock` |
| CF-02 | Product master data | Edit product name/stock while offline | Same product edited by another user | Field-level edit conflict | `SyncConflictModal` with local/remote diff | Ask user | Cashier/admin picks `sync.keepLocal` or `sync.keepRemote` | `sync.conflictTitle` |
| CF-03 | Customer record | Update customer phone/address offline | Same customer updated by another user | Field-level edit conflict | `SyncConflictModal` with local/remote diff | Ask user | User picks local or remote | `sync.conflictTitle` |
| CF-04 | Inventory adjustment | Adjust stock offline | Same SKU adjusted by warehouse app | Numeric merge conflict | Inline toast: "Local adjustment +N, remote +M, applied net change +N" | Merge numeric delta | User can open adjustment history to override | `sync.stockMerged` |
| CF-05 | Delete vs update | Delete product offline | Same product updated remotely | Delete/update conflict | `SyncConflictModal` with delete warning | Ask user | User confirms delete or restores remote | `sync.deleteConflict` |
| CF-06 | Price list | Update price offline | Price changed by admin on server | Single-field numeric conflict | Inline banner on product card with accept/reject | Keep remote | Seller can tap to keep local promotional price | `sync.priceConflict` |
| CF-07 | Multi-device same user | Two tablets logged in as same cashier both create offline orders | Both push orders when online | No direct data conflict (orders are independent) | Background sync success toast, no blocking UI | Keep both | N/A | `sync.syncComplete` |
| CF-08 | Network intermittent | Auto-sync retry after 409 conflict | Server returns conflict for product | Backend-driven conflict | `SyncConflictModal` triggered by `sync-conflict` event | Ask user | User resolves per CF-02 | `sync.conflictTitle` |

## UX patterns

### 1. `SyncConflictModal`

- Triggered by `window.dispatchEvent(new CustomEvent('sync-conflict', { detail: conflict }))`.
- Shows entity type + ID, side-by-side JSON diff, two actions: keep local / keep remote.
- Used for: CF-02, CF-03, CF-05, CF-08.
- Current implementation: `apps/web/src/components/SyncConflictModal.tsx` supports only `product` entityType and sends chosen version to `/sync/resolve`.

### 2. Inline warning / toast

- Non-blocking banner or toast with one-tap action.
- Used for: CF-01, CF-04, CF-06, CF-07.
- Should auto-dismiss on success sync.

### 3. Background auto-merge

- Safe numeric merges (stock delta, order count) are applied without blocking the user.
- Must write an audit entry to `outbox_events` / sync log for traceability.

## Current implementation gaps

| Gap | Impact | Next step |
|---|---|---|
| Only `product` conflicts are handled | Customer/order/price conflicts cannot be resolved | Extend `entityType` mapping in `SyncConflictModal` and `/sync/resolve` API |
| `local` and `remote` payloads are empty placeholders in `syncService.push()` | User cannot see what changed | Populate real diff from server 409 response in `apps/web/src/lib/sync-service.ts` |
| No field-level merge UI | User must pick all-local or all-remote | Future: add per-field merge in `SyncConflictModal` |
| No offline indicator / conflict badge | Cashier does not know sync is pending or conflict exists | Add pending-sync count + online/offline badge in `AppLayout` |
| No E2E coverage for conflict flows | Regression risk | Add Playwright test: go offline → edit product → go online → resolve conflict |

## Test matrix

| Test | Type | Steps | Expected |
|---|---|---|---|
| Offline product edit triggers conflict modal | E2E | Simulate offline, edit product, another session edits same product, restore network, sync | `SyncConflictModal` visible with local/remote diff |
| Keep local wins | E2E | In conflict modal choose keep local | Product shows local value after sync |
| Keep remote wins | E2E | In conflict modal choose keep remote | Product shows remote value after sync |
| Stock adjustment auto-merge | E2E | Offline stock +10, remote stock +5 | Result stock = previous +15, toast `sync.stockMerged` |
| Conflict event unit test | Unit | Dispatch `sync-conflict` event | `SyncConflictModal` renders with conflict details |
| Service worker serves offline page | Unit/E2E | Disconnect network, navigate | `/offline.html` served from cache |

## Owner and cadence

- **Owner role**: Frontend/PWA Engineer + Product/UX
- **Review cadence**: Each sync-related PR must update this matrix if it adds a new conflict scenario.
- **Traceability**: Link E2E tests to rows in this matrix.

## References

- `apps/web/src/components/SyncConflictModal.tsx`
- `apps/web/src/lib/sync-service.ts`
- `apps/web/src/lib/offline-db.ts`
- `apps/web/public/sw.js`
- `apps/web/public/manifest.json`
