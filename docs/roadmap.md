# Smart ERP Next – Roadmap

## Next Major Feature: AI-Powered Demand Forecasting & Inventory Optimization

**Goal:** Surpass competitors (ERPNext, Odoo, VietERP, KiotViet, Nhanhvn, Misa, Sapo, Knote) by integrating machine learning for predictive inventory management.

### Why this feature?
- Reduces stockouts and overstock costs
- Improves cash flow and customer satisfaction
- Differentiates from competitors lacking AI-driven recommendations

### Key components

1. **Data Collection & Preparation**
   - Historical sales data (daily granularity)
   - Seasonality factors (holidays, promotions)
   - External signals (weather, market trends via API)

2. **Forecasting Models**
   - Time-series models (Prophet, ARIMA) for baseline
   - XGBoost/LightGBM for feature-rich predictions
   - Ensemble for final forecast

3. **Inventory Optimization**
   - Economic order quantity (EOQ) calculation
   - Safety stock levels based on demand variability
   - Automated reorder point recommendations

4. **Integration with Current System**
   - New API endpoints in `apps/api/src/analytics/forecast`
   - Dashboard in `apps/web/src/app/analytics/forecast`
   - Background job scheduler (cron) for daily model retraining

5. **Tech Stack Additions**
   - Python microservice for model serving (FastAPI + sklearn)
   - Redis for caching predictions
   - Celery for async training tasks (if using Python)

### Implementation Phases

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 1 | 2 weeks | Data pipeline + baseline Prophet model |
| 2 | 2 weeks | XGBoost feature engineering and evaluation |
| 3 | 1 week | API integration and dashboard UI |
| 4 | 1 week | Optimization logic and automated reorder triggers |

### Success Metrics
- Forecast accuracy (MAPE) < 20%
- Inventory turnover increase by 15%
- Stockout reduction by 30%

### Open Questions
- Should we build our own Python service or use existing cloud ML (Vertex AI, SageMaker)?
- What external data sources (weather, holidays) are available via free APIs?

---
*Roadmap reviewed: 2026-05-11*
