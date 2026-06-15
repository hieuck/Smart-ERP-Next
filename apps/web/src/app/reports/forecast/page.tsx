// @ts-nocheck
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/layout/AuthGuard';
import { PageHeader } from '@smart-erp/shared';
import { BarChart, Calendar } from 'lucide-react';

interface ForecastItem {
  productId: string;
  productName: string;
  last90DaysAverage: number;
  forecastedDemand: number[];
}

const asArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value : [];

export default function ForecastPage() {
  const { t } = useTranslation('common');
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/insights/forecast', { params: { days } });
      setForecast(asArray<ForecastItem>(res.data?.forecast ?? res.data));
    } catch (err) {
      setForecast([]);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <PageHeader
          title={t('forecast.title')}
          description={t('forecast.days', { days })}
          icon={<BarChart className="w-5 h-5" />}
          iconColor="blue"
          actions={
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value={7}>7 {t('common.days')}</option>
              <option value={30}>30 {t('common.days')}</option>
              <option value={60}>60 {t('common.days')}</option>
            </select>
          }
        />

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        ) : forecast.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {t('forecast.noData')}
          </div>
        ) : (
          <div className="space-y-6">
            {forecast.map((item) => (
              <div key={item.productId} className="bg-white dark:bg-gray-800 rounded-xl border p-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{item.productName}</h3>
                    <p className="text-sm text-gray-500">
                      {t('forecast.avgDemand')}: {item.last90DaysAverage.toFixed(1)} / ngày
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>{days} ngày</span>
                  </div>
                </div>
                <div className="flex gap-1 overflow-x-auto pb-2">
                  {item.forecastedDemand.map((demand, idx) => (
                    <div key={idx} className="flex flex-col items-center min-w-[40px]">
                      <div
                        className="w-6 bg-purple-500 rounded-t"
                        style={{ height: `${Math.min(demand * 3, 100)}px` }}
                      />
                      <span className="text-xs mt-1">{idx + 1}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-right text-sm font-medium text-purple-600">
                  {t('forecast.forecasted')}: {item.forecastedDemand.reduce((a,b) => a+b, 0)} đơn vị
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

