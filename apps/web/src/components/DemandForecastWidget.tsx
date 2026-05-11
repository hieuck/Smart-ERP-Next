'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface ForecastProps {
  productId: string;
}

export function DemandForecastWidget({ productId }: ForecastProps) {
  const { t } = useTranslation('common');
  const [forecast, setForecast] = useState<number[] | null>(null);
  const [reorder, setReorder] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const res = await apiClient.get(`/analytics/forecast/product/${productId}?days=30`);
        setForecast(res.data.forecast);
        setReorder(res.data.reorderRecommendation);
      } catch (err) {
        console.error('Failed to load forecast', err);
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, [productId]);

  if (loading) return <div className="animate-pulse h-24 bg-gray-100 dark:bg-gray-700 rounded"></div>;
  if (!forecast) return null;

  const totalForecast = forecast.reduce((a,b)=>a+b,0);
  const avgDaily = totalForecast / forecast.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {t('inventory.demandForecast')}
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">{t('inventory.avgDailyDemand')}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{Math.round(avgDaily)}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">{t('inventory.total30d')}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{totalForecast}</p>
        </div>
        {reorder && (
          <div>
            <p className="text-gray-500 dark:text-gray-400">{t('inventory.reorderSuggestion')}</p>
            <p className="text-lg font-bold text-blue-600">{reorder}</p>
          </div>
        )}
      </div>
      {!reorder && (
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <AlertCircle className="w-3 h-3" />
          {t('inventory.insufficientData')}
        </div>
      )}
    </div>
  );
}
