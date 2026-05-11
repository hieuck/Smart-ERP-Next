# Xero Integration

Connect your Xero accounting software to Smart ERP Next for automatic sync of customers, invoices, and payments.

## Prerequisites

- A Xero organisation (paid plan)
- Create a Xero app in the [Xero Developer Portal](https://developer.xero.com)
- Obtain OAuth 2.0 credentials:
  - Client ID
  - Client Secret
- Generate a Refresh Token using the OAuth authorisation flow (you can use the Xero Postman collection or a tool like OAuth 2.0 Playground)

## Setup Steps

1. In Smart ERP Next, go to **Settings → Xero**.
2. Fill in the required fields:
   - **Client ID / Client Secret** – from your Xero app.
   - **Refresh Token** – generated after authorising your app.
   - **Xero Tenant ID** – your organisation’s tenant ID (found in API responses or via the /connections endpoint).
3. Choose which entities to sync (customers, invoices, payments).
4. Click **Save**.

## Sync Behaviour

- **Customers**: manual or via cron (every 24h). Maps Xero contacts to local `customers` table.
- **Invoices**: manual or via cron. Maps Xero invoices to local `orders` with channel `xero`.
- **Payments**: optional – syncs payments from Xero to local `payments` table.

## Webhooks (Optional)

Xero supports webhooks for real‑time updates. After saving your store, configure the webhook URL in your Xero app and point it to `https://your-domain.com/api/xero/webhooks`.

## Troubleshooting

- **Invalid token** – ensure your Refresh Token is still valid. If it expires, regenerate it via the OAuth flow.
- **Rate limits** – Xero API has rate limits. Our sync respects a back‑off period.

## Supported Features

- Customer sync (name, email, phone, address)
- Invoice sync (status, total, line items, date)
- Basic payment sync
