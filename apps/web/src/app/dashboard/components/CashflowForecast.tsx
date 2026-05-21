// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { TrendingDown, TrendingUp, DollarSign } from 'lucide-react';

interface ForecastDay {
  date: string;
  inflow: number;
  outflow: number;
  net_cashflow: number;
  cumulative: number;
}

export function CashflowForecast() {
  const { t } = useTranslation('common');
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const res = await apiClient.get('/analytics/cashflow-forecast?days=30');
        setForecast(res.data.forecast);
        setExplanation(res.data.explanation);
      } catch (error) {
        console.error('Failed to fetch cashflow forecast', error);
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, []);

  const formatVND = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const netCumulative = forecast.length > 0 ? forecast[forecast.length - 1].cumulative : 0;
  const isPositive = netCumulative >= 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {t('dashboard.cashflowForecast')}
        </h2>
        <DollarSign className="w-4 h-4 text-gray-400" />
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('dashboard.forecastPeriod')}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              30 {t('days')}
            </span>
          </div>
          <div className={`flex items-baseline justify-between p-3 rounded-lg ${isPositive ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <span className="text-sm font-medium">{t('dashboard.netCashflow')}</span>
            <span className={`text-xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{formatVND(netCumulative)}
            </span>
          </div>
          <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            {explanation}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-between text-xs text-gray-400">
              <span>{t('dashboard.avgDailyInflow')}: {formatVND(forecast[0]?.inflow || 0)}</span>
              <span>{t('dashboard.avgDailyOutflow')}: {formatVND(forecast[0]?.outflow || 0)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

