'use client';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { Card, Spinner } from '@smart-erp/ui';
import { apiClient } from '@/lib/api-client';

interface ForecastData {
  dates: string[];
  values: number[];
  historical: { date: string; net: number }[];
}

export default function CashflowForecastPage() {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ForecastData | null>(null);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const res = await apiClient.get('/analytics/cashflow/forecast?days=30');
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, []);

  if (loading) return <div className="p-8 flex justify-center"><Spinner /></div>;
  if (!data) return <div className="p-8 text-center text-red-500">{t('common.error')}</div>;

  // Combine historical (last 30 days) + forecast for chart
  const chartData = [
    ...data.historical.slice(-30).map(h => ({ date: h.date, actual: h.net, forecast: null })),
    ...data.dates.map((d, idx) => ({ date: d, actual: null, forecast: data.values[idx] }))
  ];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{t('analytics.cashflowForecast')}</h1>
      <p className="text-gray-500 mb-6">{t('analytics.cashflowDescription')}</p>

      <Card className="p-4">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${v / 1_000_000}M`} />
            <Tooltip formatter={(value) => value ? formatCurrency(value as number) : '—'} />
            <Legend />
            <Line type="monotone" dataKey="actual" stroke="#3b82f6" name={t('analytics.actualNetCash')} strokeWidth={2} />
            <Line type="monotone" dataKey="forecast" stroke="#f97316" name={t('analytics.forecastNetCash')} strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="mt-6 text-sm text-gray-400">
        {t('analytics.cashflowDisclaimer')}
      </div>
    </div>
  );
}
