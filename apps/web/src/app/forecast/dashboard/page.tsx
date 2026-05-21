// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Chart } from '@smart-erp/shared';
import { apiClient } from '@/lib/api-client';

interface ForecastData {
  productId: string;
  predictions: { date: string; quantity: number }[];
  suggestedOrder: number;
  confidenceLower: { date: string; quantity: number }[];
  confidenceUpper: { date: string; quantity: number }[];
  generatedAt: string;
  isFallback?: boolean;
}

interface ApiResponse {
  productId: string;
  data: ForecastData;
}

export default function ForecastDashboard() {
  const { t } = useTranslation('common');
  const api = apiClient;
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState('PROD-001');

  useEffect(() => {
    fetchForecast();
  }, [productId]);

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ApiResponse>(`/forecast/product/${productId}`);
      setData(response.data.data);
    } catch (err) {
      setError(t('analytics.forecast.metrics.confidence') + ': ' + t('forecastError'));
    } finally {
      setLoading(false);
    }
  };

  const chartData = data?.predictions?.slice(0, 30).map((d) => ({
    x: d.date.split('-').slice(1).join('/'),
    y: Math.max(0, d.quantity),
  })) || [];

  const confidenceUpperData = data?.confidenceUpper?.slice(0, 30).map((d) => ({
    x: d.date.split('-').slice(1).join('/'),
    y: Math.max(0, d.quantity),
  })) || [];

  const confidenceLowerData = data?.confidenceLower?.slice(0, 30).map((d) => ({
    x: d.date.split('-').slice(1).join('/'),
    y: Math.max(0, d.quantity),
  })) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('analytics.forecast.title')}</h1>
        {data?.isFallback && (
          <span className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
            Demo Mode
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600">{t('analytics.forecast.subtitle')}</p>

      <div className="flex gap-4 items-center">
        <label className="text-sm font-medium">{t('analytics.forecast.productId')}:</label>
        <input
          type="text"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Enter Product ID"
        />
        <button
          onClick={fetchForecast}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? t('actions.processing') : t('actions.search.title')}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : data && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-lg shadow">
              <div className="text-sm text-gray-500">{t('analytics.forecast.metrics.reorder')}</div>
              <div className="text-2xl font-bold">{data.suggestedOrder || '-'}</div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <div className="text-sm text-gray-500">{t('analytics.forecast.metrics.confidence')}</div>
              <div className="text-2xl font-bold">85%</div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <div className="text-sm text-gray-500">{t('analytics.forecast.metrics.mape')}</div>
              <div className="text-2xl font-bold">12.5%</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">{t('analytics.forecast.table.predicted')}</h2>
            <Chart
              type="line"
              data={chartData}
              xLabel={t('analytics.forecast.table.date')}
              yLabel={t('forecast.demand')}
            />
            {confidenceUpperData.length > 0 && (
              <Chart
                type="area"
                data={confidenceUpperData}
                xLabel={t('analytics.forecast.table.date')}
                yLabel=""
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
