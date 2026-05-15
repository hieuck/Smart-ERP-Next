'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AuthGuard from '@/components/layout/AuthGuard';
import { apiClient } from '@/lib/api-client';

interface DailyForecast {
  date: string;
  quantity: number;
}

interface ForecastResponse {
  productId: string;
  predictions: DailyForecast[];
  suggestedOrder: number;
  confidenceLower: DailyForecast[];
  confidenceUpper: DailyForecast[];
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

const formatNumber = (n: number) => n.toLocaleString('vi-VN');

export default function ForecastPage() {
  const { t } = useTranslation('common');
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [reorder, setReorder] = useState<ReorderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState('PROD-001');

  const fetchForecast = async (pid: string) => {
    setLoading(true);
    setError(null);
    try {
      const [forecastRes, reorderRes] = await Promise.all([
        apiClient.get(`/forecast/product/${pid}`),
        apiClient.post('/inventory-recommendation/suggest', {
          productId: pid,
          currentStock: 50, // Default for demo
        }),
      ]);
      setForecast(forecastRes.data.data);
      setReorder(reorderRes.data);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || t('common.error');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast(productId);
  }, [productId, t]);

  const getStockStatusColor = (shouldReorder: boolean) => {
    if (shouldReorder) return 'text-red-600 bg-red-50 dark:bg-red-900/20';
    return 'text-green-600 bg-green-50 dark:bg-green-900/20';
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('analytics.forecast.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('analytics.forecast.subtitle')}
            </p>
          </div>
          {forecast?.isFallback && (
            <span className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
              Demo Mode
            </span>
          )}
        </div>

        {/* Product Selector */}
        <div className="flex gap-4 items-center">
          <label className="text-sm font-medium">{t('analytics.forecast.productId')}:</label>
          <input
            type="text"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
            placeholder="Enter Product ID"
          />
          <button
            onClick={() => fetchForecast(productId)}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('common.search')}
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t('common.loading')}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Reorder Alert Card */}
        {reorder && !loading && (
          <div className={`rounded-xl border p-4 ${getStockStatusColor(reorder.shouldReorder)}`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  {reorder.shouldReorder
                    ? t('inventory.shouldReorder')
                    : t('inventory.stockOk')}
                </h3>
                <p className="text-sm mt-1 opacity-80">
                  {reorder.daysUntilStockout
                    ? `${reorder.daysUntilStockout} ${t('inventory.daysUntilStockout')}`
                    : t('inventory.sufficientStock')}
                </p>
              </div>
              {reorder.suggestedOrderQuantity > 0 && (
                <div className="text-right">
                  <p className="text-xs opacity-70">{t('inventory.suggestedOrderQuantity')}</p>
                  <p className="text-2xl font-bold">{reorder.suggestedOrderQuantity}</p>
                </div>
              )}
            </div>

            {/* Reasons */}
            {reorder.reasons.length > 0 && (
              <div className="mt-3 pt-3 border-t border-current/20">
                {reorder.reasons.map((reason, idx) => (
                  <p key={idx} className="text-sm">• {reason}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Metrics Grid */}
        {forecast && !loading && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 uppercase">{t('inventory.currentStock')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatNumber(reorder?.currentStock ?? 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 uppercase">{t('inventory.reorderPoint')}</p>
              <p className="text-xl font-bold text-blue-600">
                {formatNumber(reorder?.reorderPoint ?? 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 uppercase">{t('inventory.safetyStock')}</p>
              <p className="text-xl font-bold text-purple-600">
                {formatNumber(reorder?.safetyStock ?? 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 uppercase">{t('analytics.forecast.metrics.reorder')}</p>
              <p className="text-xl font-bold text-green-600">
                {formatNumber(reorder?.suggestedOrderQuantity ?? forecast.suggestedOrder)}
              </p>
            </div>
          </div>
        )}

        {/* Forecast Table */}
        {forecast && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      {t('analytics.forecast.table.date')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                      {t('analytics.forecast.table.predicted')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                      {t('analytics.forecast.table.lower')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                      {t('analytics.forecast.table.upper')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {forecast.predictions.slice(0, 14).map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {new Date(item.date).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                        {formatNumber(item.quantity)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {formatNumber(forecast.confidenceLower[idx]?.quantity ?? '-')}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {formatNumber(forecast.confidenceUpper[idx]?.quantity ?? '-')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Demand Summary */}
        {reorder && !loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 uppercase">{t('inventory.predictedDemand7d')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatNumber(reorder.predictedDemandNext7d)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 uppercase">{t('inventory.predictedDemand30d')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatNumber(reorder.predictedDemandNext30d)}
              </p>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}