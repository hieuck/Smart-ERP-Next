# Smart ERP Next – Roadmap

## ✅ AI-Powered Demand Forecasting & Inventory Optimization — COMPLETED

| Phase | Components | Status |
|-------|-----------|--------|
| 1 - Prophet Model | Data pipeline + baseline Prophet ML | ✅ Done |
| 2 - Inventory Optimization | Reorder suggestions, safety stock, stockout prediction | ✅ Done |
| 3 - API + Full UI | Web dashboard, Mobile screens, Desktop app | ✅ Done |
| 4 - Infra | Docker, tests, i18n, docs | ✅ Done |

## ✅ Manufacturing Module — Advanced Production Planning — COMPLETED

| Phase | Components | Status |
|-------|-----------|--------|
| 1 | Multi-level BOM schema + CRUD API | ✅ Done |
| 2 | Production orders + scheduling | ✅ Done |
| 3 | MRP calculation engine | ✅ Done |
| 4 | UI: Web + Mobile + Desktop | ✅ Done |
| 5 | Cost roll-up + variance analysis | ✅ Done |

## Next Feature: Quality Management System (QMS)

**Goal:** Build production-grade QMS vượt trội ERPNext/Odoo in:
- Inspection plans with sampling rules
- Non-conformance tracking and CAPA (Corrective/Preventive Actions)
- SPC (Statistical Process Control) charts
- Supplier quality scoring

### Key Components

1. **Inspection Plans**
   - Define inspection criteria per product/BOM stage
   - Sampling rules (AQL-based)
   - Pass/fail criteria with measurement tolerances

2. **Non-Conformance Reports (NCR)**
   - Track defects by production order, supplier, or product
   - Root cause analysis (5-Why, Fishbone)
   - CAPA workflow (Corrective/Preventive Actions)

3. **SPC Charts**
   - Control charts (X-bar, R-chart, p-chart)
   - Process capability (Cp, Cpk)
   - Real-time alerts for out-of-control conditions

4. **Supplier Quality Scoring**
   - Score suppliers by defect rate, on-time delivery
   - Quality certificates and compliance tracking
   - Supplier audit management

### Implementation Phases

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 1 | 1 week | Inspection plans + NCR schema + CRUD API |
| 2 | 1 week | CAPA workflow + root cause analysis |
| 3 | 1 week | SPC charts + process capability |
| 4 | 1 week | UI: Web + Mobile + Desktop |
| 5 | 3 days | Supplier quality scoring + audit management |

---
*Roadmap reviewed: 2026-05-15*