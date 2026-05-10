# Smart ERP Next — API Reference

**Base URL:** `http://localhost:3000`

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

---

## Auth

### POST /auth/register
```json
{ "email": "user@example.com", "password": "password123", "name": "Nguyễn Văn A" }
```

### POST /auth/login
```json
{ "email": "user@example.com", "password": "password123" }
```
Response: `{ "access_token": "...", "user": { "id", "email", "name", "tenantId", "role" } }`

---

## Products `/products`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | List (page, limit, search, isActive) |
| GET | `/products/:id` | Get by ID |
| GET | `/products/sku/:sku` | Get by SKU |
| POST | `/products` | Create |
| PATCH | `/products/:id` | Update |
| DELETE | `/products/:id` | Delete |
| PATCH | `/products/:id/stock` | Adjust stock `{ quantity, type: IN\|OUT\|ADJUSTMENT, notes }` |
| GET | `/products/:id/transactions` | Stock transaction history |

---

## Customers `/customers`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/customers` | List (page, limit, search, group, isActive) |
| GET | `/customers/:id` | Get by ID |
| POST | `/customers` | Create |
| PATCH | `/customers/:id` | Update |
| DELETE | `/customers/:id` | Delete |

**Create body:**
```json
{
  "code": "KH-001", "name": "Nguyễn Văn A", "phone": "0901234567",
  "customerGroup": "retail", "debtLimit": 5000000, "province": "TP. Hồ Chí Minh"
}
```

---

## Suppliers `/suppliers`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/suppliers` | List (page, limit, search, isActive) |
| GET | `/suppliers/:id` | Get by ID |
| POST | `/suppliers` | Create |
| PATCH | `/suppliers/:id` | Update |
| DELETE | `/suppliers/:id` | Delete |

**Create body:**
```json
{
  "code": "NCC-001", "name": "Công ty ABC", "phone": "028 1234 5678",
  "taxCode": "0123456789", "bankAccount": "1234567890", "bankName": "Vietcombank"
}
```

---

## Orders `/orders`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/orders` | List (page, limit, search, status, paymentStatus, channel) |
| GET | `/orders/:id` | Get with items |
| POST | `/orders` | Create order |
| PATCH | `/orders/:id/status` | Update status |

**Status transitions:**
- `draft` → `confirmed` \| `cancelled`
- `confirmed` → `processing` \| `cancelled`
- `processing` → `shipped` \| `cancelled`
- `shipped` → `delivered` \| `returned`

**Create body:**
```json
{
  "customerId": "uuid", "channel": "pos", "paymentMethod": "cash",
  "items": [{ "productId": "uuid", "quantity": 2, "unitPrice": 150000 }]
}
```

---

## Purchasing `/purchasing`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/purchasing` | List (page, limit, search, status) |
| GET | `/purchasing/:id` | Get with items |
| POST | `/purchasing` | Create purchase order |
| PATCH | `/purchasing/:id/confirm` | Confirm (draft → confirmed) |
| POST | `/purchasing/:id/receive` | Receive goods (updates stock) |
| PATCH | `/purchasing/:id/cancel` | Cancel |

**Create body:**
```json
{
  "supplierId": "uuid", "expectedDate": "2026-06-01",
  "items": [{ "productId": "uuid", "orderedQty": 100, "unitCost": 80000 }]
}
```

**Receive body:**
```json
{ "items": [{ "itemId": "uuid", "receivedQty": 50 }] }
```

---

## Inventory `/inventory`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/inventory/summary` | Stock summary stats |
| GET | `/inventory/transactions` | Transaction history (page, limit, productId, type) |
| POST | `/inventory/adjust` | Manual stock adjustment |
| GET | `/inventory/low-stock` | Products below min stock |

**Adjust body:**
```json
{ "productId": "uuid", "quantity": 10, "type": "IN", "notes": "Nhập thêm hàng" }
```

---

## Reports `/reports`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/reports/revenue` | Revenue by period (from, to, groupBy: day\|week\|month) |
| GET | `/reports/profit` | Revenue + cost + profit |
| GET | `/reports/top-products` | Top selling products (from, to, limit) |
| GET | `/reports/inventory` | Inventory value + low stock |
| GET | `/reports/customers` | Top customers by spend |
| GET | `/reports/summary` | Period summary (orderCount, revenue, collected, debt) |

---

## Insights `/insights`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/insights/dashboard` | Full dashboard data (stats, charts, recent orders, top products, insights) |

---

## Payments `/payments`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/payments` | List (page, limit, type: receipt\|payment, method, from, to) |
| GET | `/payments/summary` | Summary stats (receipt total, payment total, balance) |
| GET | `/payments/:id` | Get by ID |
| POST | `/payments` | Create receipt or payment |

**Create body:**
```json
{
  "type": "receipt",
  "partyType": "customer",
  "partyName": "Nguyễn Văn A",
  "amount": 1500000,
  "method": "cash",
  "notes": "Thu tiền đơn DH-000001"
}
```

---

## Warehouses `/warehouses`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/warehouses` | List all active warehouses |
| GET | `/warehouses/default` | Get default warehouse |
| GET | `/warehouses/:id` | Get by ID |
| POST | `/warehouses` | Create |
| PATCH | `/warehouses/:id` | Update (set isDefault=true to change default) |
| DELETE | `/warehouses/:id` | Delete |

**Create body:**
```json
{ "code": "KHO-001", "name": "Kho chính", "address": "123 ABC", "isDefault": true }
```

---

## Users `/users`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List (tenant-scoped) |
| GET | `/users/:id` | Get by ID |
| POST | `/users` | Create |
| PATCH | `/users/:id` | Update |
| DELETE | `/users/:id` | Delete |

---

## Tenants `/tenants`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tenants` | List all tenants |
| POST | `/tenants` | Create tenant |
| PATCH | `/tenants/:id` | Update tenant |

---

## Health

### GET /health
```json
{ "status": "ok", "db": "ok", "timestamp": "2026-05-10T00:00:00.000Z", "uptime": 3600 }
```

---

## Error Responses

| Code | Meaning |
|------|---------|
| 400 | Validation error |
| 401 | Missing/invalid token |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Duplicate code/SKU or CRDT conflict |
| 500 | Internal server error |

```json
{ "statusCode": 400, "message": "Mã SKU đã tồn tại", "error": "Conflict" }
```
