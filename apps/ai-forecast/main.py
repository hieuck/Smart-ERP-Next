from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
from prophet import Prophet
import logging
from datetime import datetime, timedelta

app = FastAPI(title="Smart ERP AI Forecasting")
logger = logging.getLogger(__name__)

class SalesHistoryItem(BaseModel):
    date: str  # YYYY-MM-DD
    quantity: int

class ForecastRequest(BaseModel):
    product_id: str
    sales_history: List[SalesHistoryItem]
    lookahead_days: int = 30

class ForecastResponse(BaseModel):
    product_id: str
    predicted_daily_demand: List[dict]  # [{date, quantity}]
    suggested_order_quantity: int
    confidence_lower: List[dict]
    confidence_upper: List[dict]

@app.post("/forecast", response_model=ForecastResponse)
async def forecast(request: ForecastRequest):
    if len(request.sales_history) < 7:
        raise HTTPException(status_code=400, detail="Need at least 7 days of history")

    # Prepare data for Prophet
    df = pd.DataFrame([
        {"ds": item.date, "y": item.quantity}
        for item in request.sales_history
    ])
    df["ds"] = pd.to_datetime(df["ds"])

    # Train model
    model = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
    model.fit(df)

    # Forecast future
    future = model.make_future_dataframe(periods=request.lookahead_days, include_history=False)
    forecast = model.predict(future)

    # Extract predictions
    predictions = [
        {"date": row["ds"].strftime("%Y-%m-%d"), "quantity": round(row["yhat"])}
        for _, row in forecast.iterrows()
    ]
    lower = [
        {"date": row["ds"].strftime("%Y-%m-%d"), "quantity": round(row["yhat_lower"])}
        for _, row in forecast.iterrows()
    ]
    upper = [
        {"date": row["ds"].strftime("%Y-%m-%d"), "quantity": round(row["yhat_upper"])}
        for _, row in forecast.iterrows()
    ]

    # Suggested order = sum of predicted demand for next 7 days
    suggested = sum(p["quantity"] for p in predictions[:7])

    return ForecastResponse(
        product_id=request.product_id,
        predicted_daily_demand=predictions,
        suggested_order_quantity=suggested,
        confidence_lower=lower,
        confidence_upper=upper,
    )

@app.get("/health")
async def health():
    return {"status": "ok"}
