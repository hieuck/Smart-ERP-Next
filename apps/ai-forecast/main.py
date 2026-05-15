from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
from prophet import Prophet
import logging
from datetime import datetime, timedelta
import os

app = FastAPI(title="Smart ERP AI Forecasting")
logger = logging.getLogger(__name__)

# Configuration
AI_FORECAST_CONFIG = {
    "min_history_days": 7,
    "default_lookahead_days": 30,
    "reorder_lead_days": 7,
    "safety_stock_days": 3,
}

class SalesHistoryItem(BaseModel):
    date: str  # YYYY-MM-DD
    quantity: int

class ForecastRequest(BaseModel):
    product_id: str
    sales_history: List[SalesHistoryItem]
    lookahead_days: int = 30

class InventoryData(BaseModel):
    product_id: str
    current_stock: int
    reorder_point: Optional[int] = None
    supplier_lead_days: Optional[int] = None

class ReorderRequest(BaseModel):
    product_id: str
    sales_history: List[SalesHistoryItem]
    inventory: InventoryData

class ForecastResponse(BaseModel):
    product_id: str
    predicted_daily_demand: List[dict]  # [{date, quantity}]
    suggested_order_quantity: int
    confidence_lower: List[dict]
    confidence_upper: List[dict]
    ai_model_version: str = "prophet-v1"

class ReorderResponse(BaseModel):
    product_id: str
    should_reorder: bool
    current_stock: int
    predicted_demand_next_7d: int
    predicted_demand_next_30d: int
    suggested_order_quantity: int
    safety_stock: int
    reorder_point: int
    days_until_stockout: Optional[int] = None
    reasons: List[str]

class HealthResponse(BaseModel):
    status: str
    model_version: str
    timestamp: str

@app.post("/forecast", response_model=ForecastResponse)
async def forecast(request: ForecastRequest):
    """Generate demand forecast using Facebook Prophet ML model."""
    if len(request.sales_history) < AI_FORECAST_CONFIG["min_history_days"]:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least {AI_FORECAST_CONFIG['min_history_days']} days of history"
        )

    # Prepare data for Prophet
    df = pd.DataFrame([
        {"ds": item.date, "y": item.quantity}
        for item in request.sales_history
    ])
    df["ds"] = pd.to_datetime(df["ds"])

    # Train model with seasonality
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        changepoint_prior_scale=0.05
    )
    model.fit(df)

    # Forecast future
    lookahead = request.lookahead_days or AI_FORECAST_CONFIG["default_lookahead_days"]
    future = model.make_future_dataframe(periods=lookahead, include_history=False)
    forecast_df = model.predict(future)

    # Extract predictions
    predictions = [
        {"date": row["ds"].strftime("%Y-%m-%d"), "quantity": round(max(0, row["yhat"]))}
        for _, row in forecast_df.iterrows()
    ]
    lower = [
        {"date": row["ds"].strftime("%Y-%m-%d"), "quantity": round(max(0, row["yhat_lower"]))}
        for _, row in forecast_df.iterrows()
    ]
    upper = [
        {"date": row["ds"].strftime("%Y-%m-%d"), "quantity": round(max(0, row["yhat_upper"]))}
        for _, row in forecast_df.iterrows()
    ]

    # Suggested order = sum of predicted demand for next 7 days
    suggested = sum(p["quantity"] for p in predictions[:7])

    logger.info(f"Forecast generated for {request.product_id}: suggested_order={suggested}")

    return ForecastResponse(
        product_id=request.product_id,
        predicted_daily_demand=predictions,
        suggested_order_quantity=suggested,
        confidence_lower=lower,
        confidence_upper=upper,
    )

@app.post("/reorder-suggestion", response_model=ReorderResponse)
async def reorder_suggestion(request: ReorderRequest):
    """Calculate reorder suggestions based on forecast and current inventory."""
    if len(request.sales_history) < AI_FORECAST_CONFIG["min_history_days"]:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least {AI_FORECAST_CONFIG['min_history_days']} days of history"
        )

    # Generate forecast
    df = pd.DataFrame([
        {"ds": item.date, "y": item.quantity}
        for item in request.sales_history
    ])
    df["ds"] = pd.to_datetime(df["ds"])

    model = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
    model.fit(df)

    future = model.make_future_dataframe(periods=30, include_history=False)
    forecast_df = model.predict(future)

    # Calculate demand predictions
    predictions = [
        {"date": row["ds"].strftime("%Y-%m-%d"), "quantity": round(max(0, row["yhat"]))}
        for _, row in forecast_df.iterrows()
    ]

    demand_7d = sum(p["quantity"] for p in predictions[:7])
    demand_30d = sum(p["quantity"] for p in predictions)

    # Inventory calculations
    current_stock = request.inventory.current_stock
    safety_stock = demand_7d * AI_FORECAST_CONFIG["safety_stock_days"] // 7

    # Reorder point calculation
    lead_days = request.inventory.supplier_lead_days or AI_FORECAST_CONFIG["reorder_lead_days"]
    reorder_point = int(demand_7d * lead_days / 7) + safety_stock

    # Stockout calculation
    days_until_stockout = None
    remaining_stock = current_stock

    for i, pred in enumerate(predictions):
        remaining_stock -= pred["quantity"]
        if remaining_stock <= 0:
            days_until_stockout = i + 1
            break

    # Decision logic
    should_reorder = (
        current_stock <= reorder_point or
        (days_until_stockout and days_until_stockout <= lead_days)
    )

    suggested_qty = max(0, demand_30d - current_stock + reorder_point)

    # Generate reasons
    reasons = []
    if should_reorder:
        if current_stock <= reorder_point:
            reasons.append(f"Current stock ({current_stock}) is at or below reorder point ({reorder_point})")
        if days_until_stockout:
            reasons.append(f"Stock will run out in {days_until_stockout} days (supplier lead time: {lead_days} days)")
    else:
        reasons.append(f"Current stock ({current_stock}) is sufficient for {days_until_stockout or 30}+ days")

    logger.info(f"Reorder suggestion for {request.product_id}: should_reorder={should_reorder}, suggested_qty={suggested_qty}")

    return ReorderResponse(
        product_id=request.product_id,
        should_reorder=should_reorder,
        current_stock=current_stock,
        predicted_demand_next_7d=demand_7d,
        predicted_demand_next_30d=demand_30d,
        suggested_order_quantity=suggested_qty,
        safety_stock=safety_stock,
        reorder_point=reorder_point,
        days_until_stockout=days_until_stockout,
        reasons=reasons
    )

@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        model_version=AI_FORECAST_CONFIG.get("model_version", "prophet-v1"),
        timestamp=datetime.now().isoformat()
    )

@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Smart ERP AI Forecasting Service",
        "version": "1.0.0",
        "endpoints": {
            "POST /forecast": "Generate demand forecast",
            "POST /reorder-suggestion": "Calculate reorder suggestions with inventory",
            "GET /health": "Health check"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)