# Smart ERP Next - New Modules Documentation

This document specifies the APIs and internal structures for the newly engineered modules.

## CRM & Sales Pipeline `/crm`
Manages the end-to-end sales lifecycle, from initial contact to closed deals, utilizing a drag-and-drop Kanban interface and AI-driven scoring.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/crm/leads` | List all pipeline leads |
| POST   | `/crm/leads` | Create a new lead |
| PATCH  | `/crm/leads/:id/status` | Move lead to a different stage (new/contacted/won) |

**Schema (`leads` table):**
- `status`: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
- `score`: AI computed or manual probability score (0-100)

---

## E-Invoice `/e-invoice`
Handles electronic invoicing fully compliant with Vietnam Decree 123/2020. Connects natively with VNPT/Misa via provider configuration.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/e-invoice` | List all issued and draft invoices |
| POST   | `/e-invoice` | Generate an e-invoice draft from sales order |
| PATCH  | `/e-invoice/:id/issue` | Sign & Issue to Tax Authority (CQT) |

---

## HR & Payroll `/hr`
Next-Gen HR system natively tracking Geo-location Check-ins and Auto-computing Net Salaries.

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST   | `/hr/attendance/shifts` | Config work shifts & hours |
| POST   | `/hr/attendance/check-in` | Mobile App Check-in (GPS + Selfie verification) |
| POST   | `/hr/payroll/boards/generate` | Auto calculate base + OT - late fees |
| GET    | `/hr/payroll/my-payslips` | Native mobile endpoint for employee payslips |

---

## Workflow Automation Engine `/automations` (Core System)
No-Code engine empowering users to create triggers based on any system event without developer intervention.

**DB Schema (`automations` table):**
- `triggerEvent`: What causes the flow to run (e.g., `invoice.issued`)
- `conditions`: JSONB declarative conditions (e.g., `{"amount": { ">": 5000000 } }`)
- `actions`: JSONB array of execution nodes (e.g., `{"type": "email", "to": "manager"}`)

*Note: The primary execution engine is tied natively to the Drizzle + NestJS lifecycle events.*
