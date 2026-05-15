import React, { useEffect, useState } from 'react';
import { useTranslation } from '@smart-erp/i18n';

interface DailyDemand {
  date: string;
  quantity: number;
}

interface ForecastResponse {
  productId: string;
  predictions: DailyDemand[];
  suggestedOrder: number;
  confidenceLower: DailyDemand[];
  confidenceUpper: DailyDemand[];
  generatedAt: string;
  isFallback?: boolean;
}

interface ReorderResponse {
  productId: string;
  shouldReorder: boolean;
  currentStock: number;
  predictedDemandNext7d: number;
  predictedDemandNext30d: number;
  suggestedOrderQuantity: number;
  safetyStock: number;
  reorderPoint: number;
  daysUntilStockout: number | null;
  reasons: string[];
}

/**
 * Desktop Forecast Screen with AI-powered demand forecasting.
 * Displays reorder suggestions and inventory status.
 */
export function ForecastScreen() {
  const { t } = useTranslation();
  const [productId, setProductId] = useState('PROD-001');
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [reorder, setReorder] = useState<ReorderResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('token');

      const [forecastRes, reorderRes] = await Promise.all([
        fetch(`${apiUrl}/forecast/product/${productId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
        fetch(`${apiUrl}/inventory-recommendation/suggest`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId, currentStock: 50 }),
        }).then((r) => r.json()),
      ]);

      setForecast(forecastRes.data);
      setReorder(reorderRes);
    } catch (err) {
      setError(t('inventory.forecastError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  const getStatusColor = (shouldReorder: boolean) => {
    return shouldReorder
      ? 'bg-red-100 text-red-800 border-l-4 border-red-500'
      : 'bg-green-100 text-green-800 border-l-4 border-green-500';
  };

  const formatNumber = (n: number) => n.toLocaleString('vi-VN');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('analytics.forecast.title')}</h1>
        {forecast?.isFallback && (
          <span className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
            Demo Mode
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600">{t('analytics.forecast.subtitle')}</p>

      {/* Product Selector */}
      <div className="flex gap-4 items-center">
        <label className="text-sm font-medium">{t('analytics.forecast.productId')}:</label>
        <input
          type="text"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="px-3 py-2 border rounded-lg"
          placeholder="Enter Product ID"
        />
        <button
          onClick={fetchForecast}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? t('common.loading') : t('common.search')}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Reorder Alert */}
      {reorder && (
        <div className={`rounded-xl p-4 ${getStatusColor(reorder.shouldReorder)}`}>
          <h3 className="text-lg font-bold">
            {reorder.shouldReorder ? t('inventory.shouldReorder') : t('inventory.stockOk')}
          </h3>
          <p className="text-sm mt-1 opacity-80">
            {reorder.daysUntilStockout
              ? `${reorder.daysUntilStockout} ${t('inventory.daysUntilStockout')}`
              : t('inventory.sufficientStock')}
          </p>
          {reorder.reasons.map((reason, idx) => (
            <p key={idx} className="text-sm mt-1">• {reason}</p>
          ))}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 uppercase">{t('inventory.currentStock')}</p>
          <p className="text-xl font-bold">{formatNumber(reorder?.currentStock ?? 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 uppercase">{t('inventory.reorderPoint')}</p>
          <p className="text-xl font-bold text-blue-600">{formatNumber(reorder?.reorderPoint ?? 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 uppercase">{t('inventory.safetyStock')}</p>
          <p className="text-xl font-bold text-purple-600">{formatNumber(reorder?.safetyStock ?? 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 uppercase">{t('inventory.suggestedOrderQuantity')}</p>
          <p className="text-xl font-bold text-green-600">
            {formatNumber(reorder?.suggestedOrderQuantity ?? forecast?.suggestedOrder ?? 0)}
          </p>
        </div>
      </div>

      {/* Forecast Table */}
      {forecast?.predictions && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">{t('analytics.forecast.table.predicted')}</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                  {t('analytics.forecast.table.date')}
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">
                  {t('analytics.forecast.table.predicted')}
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">
                  {t('analytics.forecast.table.lower')}
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">
                  {t('analytics.forecast.table.upper')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {forecast.predictions.slice(0, 14).map((day, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{day.date}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatNumber(day.quantity)}</td>
                  <td className="px-4 py-2 text-right text-gray-500">
                    {formatNumber(forecast.confidenceLower[idx]?.quantity ?? 0)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-500">
                    {formatNumber(forecast.confidenceUpper[idx]?.quantity ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}