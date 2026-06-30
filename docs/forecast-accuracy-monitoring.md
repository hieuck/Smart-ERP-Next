# Forecast Accuracy Monitoring

## Overview

The AI Demand Forecasting module generates predictions for product demand. This document defines how to monitor and improve forecast accuracy.

## Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| MAE | Mean Absolute Error | < 20% of mean demand |
| MAPE | Mean Absolute Percentage Error | < 30% |
| Bias | Systematic over/under-forecast | -5% to +5% |
| Coverage | % of SKUs with forecast | > 80% |

## Monitoring Process

1. Weekly: Compare forecast vs actual orders for the past 7 days
2. Calculate MAE/MAPE per product category
3. Flag products where MAPE > 50% for manual review
4. Retrain model if average MAE exceeds target for 2 consecutive weeks

## Implementation

The forecast accuracy data can be queried via:

```sql
SELECT
  p.category,
  COUNT(*) AS skus,
  AVG(ABS(f.predicted - a.actual) / NULLIF(a.actual, 0)) AS mape
FROM forecast_cache f
JOIN actuals a ON f.product_id = a.product_id AND f.date = a.date
JOIN products p ON p.id = f.product_id
WHERE f.date >= NOW() - INTERVAL '30 days'
GROUP BY p.category;
```
