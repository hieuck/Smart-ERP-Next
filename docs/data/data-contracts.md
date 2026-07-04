# Data Contracts

This document defines the stable data contracts used across the Smart ERP Next monorepo: database schema, API boundaries, events, and offline sync payloads. The goal is to prevent silent breakage when multiple teams or modules evolve independently.

## Core entity contracts

### Product

| Field | Type | Required | Source of truth | Notes |
|---|---|---|---|---|
| id | UUID string | yes | `products` table | Stable public identifier |
| name | string | yes | `products` table | Localized by UI, not stored per locale |
| sku | string | yes | `products` table | Unique per tenant |
| stock | integer | yes | `products` table | Must be >= 0 |
| minStock | integer | yes | `products` table | Threshold for low-stock alerts |
| reorderQuantity | integer | yes | `products` table | Suggested restock amount |
| leadTimeDays | integer | yes | `products` table | Average supplier lead time |
| safetyStock | integer | yes | `products` table | Buffer stock |
| deleted | boolean | yes | `products` table | Soft delete flag |

**API contract**
- `GET /products/:id` returns the shape above.
- `PATCH /products/:id` accepts only `name`, `stock`, `minStock`, `reorderQuantity`, `leadTimeDays`, `safetyStock`.
- `DELETE /products/:id` performs soft delete (`deleted = true`).

**Offline sync contract**
- Sync payload uses the same fields.
- `updatedAt` is a client timestamp (milliseconds) used for conflict detection.
- Soft-deleted products are still synced so other devices can apply the deletion.

### Order

| Field | Type | Required | Source of truth | Notes |
|---|---|---|---|---|
| id | UUID string | yes | `orders` table | Stable public identifier |
| customerId | UUID string | yes | `customers` table | Must reference existing customer |
| items | array | yes | `orders` table | `{ productId, quantity, unitPrice }` |
| status | enum | yes | `orders` table | `pending`, `confirmed`, `shipping`, `completed`, `cancelled` |
| totalAmount | decimal | yes | `orders` table | Computed server-side from items |
| createdAt | ISO timestamp | yes | `orders` table | UTC |

**API contract**
- `POST /orders` accepts `customerId` and `items`; server computes `totalAmount` and sets `status = pending`.
- `GET /orders/:id` returns full order shape.
- `PATCH /orders/:id/status` accepts only `status` with allowed transitions.

### Customer

| Field | Type | Required | Source of truth | Notes |
|---|---|---|---|---|
| id | UUID string | yes | `customers` table | Stable public identifier |
| name | string | yes | `customers` table | PII: Sensitive |
| email | string | no | `customers` table | PII: Sensitive |
| phone | string | no | `customers` table | PII: Sensitive |
| address | string | no | `customers` table | PII: Sensitive |
| tenantId | UUID string | yes | `customers` table | Isolation boundary |

**API contract**
- List endpoint returns `id`, `name`, `email`, `phone` for authenticated tenant users.
- `address` is only returned by `GET /customers/:id` and is masked in server logs.

## Event naming contract

All domain events published through the outbox or WebSocket follow the format:

```
<domain>.<entity>.<action>
```

Examples:

| Event | Producer | Consumers |
|---|---|---|
| `inventory.product.stock_changed` | Inventory module | Analytics, low-stock alerts, POS cache |
| `sales.order.created` | Orders module | Accounting, notifications, telemetry |
| `sales.order.status_changed` | Orders module | Customer portal, shipping, reports |
| `crm.customer.updated` | Customers module | Search index, sync service |

Rules:
- Use past-tense action (`created`, `updated`, `deleted`, `status_changed`).
- Event payload must include the entity `id`, `tenantId`, and `occurredAt` (ISO timestamp).
- Do not include full PII in events unless consumers are authorized; prefer `id` references.

## API versioning contract

- Current default version is `v1` via header `X-API-Version: 1`.
- Breaking changes to any field in the contracts above require a new API version.
- Deprecated fields include a `Sunset` response header per `docs/api-versioning.md`.

## Database schema contract

- Tables are owned by the `@smart-erp/database` package.
- Column additions are non-breaking; column renames or deletions are breaking.
- Migrations must be reversible or documented in `docs/migration-rollback.md`.
- Soft deletes must use `deleted` boolean unless a separate audit table is justified.

## Offline sync payload contract

```json
{
  "clientId": "string",
  "changes": {
    "products": [
      {
        "id": "uuid",
        "name": "string",
        "sku": "string",
        "stock": 0,
        "minStock": 0,
        "reorderQuantity": 0,
        "leadTimeDays": 0,
        "safetyStock": 0,
        "deleted": false
      }
    ]
  }
}
```

- Only `product` entity is currently supported for offline sync (see `docs/pwa/conflict-ux-matrix.md`).
- Future entities must extend this payload without removing existing fields.

## Validation contract

- Server validates all incoming payloads against DTOs.
- Client validates user input before submission but cannot trust client-side validation alone.
- Shared validation schemas live in `@smart-erp/validation` and must be used by both API and web.

## Change process

1. Propose change in an ADR under `docs/adr/` if it affects a published contract.
2. Update this document and the relevant API docs.
3. Add or update contract tests.
4. Update the offline sync and event consumer mappings if applicable.

## References

- `docs/pii-classification.md`
- `docs/data-archival.md`
- `docs/forecast-accuracy-monitoring.md`
- `docs/pwa/conflict-ux-matrix.md`
- `docs/api-versioning.md`
- `docs/migration-rollback.md`
- `packages/database/src/schema/`
