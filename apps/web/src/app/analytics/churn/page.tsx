'use client';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Spinner, DataTable, Badge } from '@smart-erp/shared';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';

interface ChurnPrediction {
  name: string;
  email: string;
  phone: string;
  churn_probability: number;
  risk_segment: string;
  days_since_last_purchase: number;
  total_spent: number;
  purchase_frequency: number;
}

const asArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value : [];

export default function ChurnPage() {
  const { t } = useTranslation('common');
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<ChurnPrediction[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [computing, setComputing] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const predRes = await apiClient.get('/analytics/churn/predictions', { params: { risk: selectedRisk || undefined } });
      setPredictions(asArray<ChurnPrediction>(predRes.data?.items ?? predRes.data));
      const sumRes = await apiClient.get('/analytics/churn/summary');
      setSummary(asArray(sumRes.data?.items ?? sumRes.data));
    } catch (err) {
      setPredictions([]);
      setSummary([]);
    } finally {
      setLoading(false);
    }
  }, [selectedRisk]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCompute = async () => {
    setComputing(true);
    try {
      await apiClient.post('/analytics/churn/compute');
      toast.success(t('analytics.churnComputeSuccess'));
      await fetchData();
    } catch (err) {
      toast.error(t('analytics.churnComputeFailed'));
    } finally {
      setComputing(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const columns = [
    { key: 'name', label: t('customers.name') },
    { key: 'email', label: t('customers.email') },
    { key: 'total_spent', label: t('customers.totalPurchased'), render: (v: number) => formatCurrency(v) },
    { key: 'purchase_frequency', label: t('analytics.purchaseFrequency'), render: (v: number) => v.toFixed(2) + ' /tháng' },
    { key: 'days_since_last_purchase', label: t('analytics.recencyDays'), render: (v: number) => v + ' ' + t('common.days') },
    { key: 'churn_probability', label: t('analytics.churnProbability'), render: (v: number) => v + '%' },
    { key: 'risk_segment', label: t('analytics.riskSegment'), render: (v: string) => {
      const variant = v === 'high' ? 'danger' : v === 'medium' ? 'warning' : 'success';
      return <Badge variant={variant}>{t(`analytics.risk_${v}`)}</Badge>;
    } },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('analytics.churnPrediction')}</h1>
        <Button onClick={handleCompute} disabled={computing}>
          {computing ? t('common.processing') : t('analytics.runChurn')}
        </Button>
      </div>

      {summary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {summary.map((seg: any) => (
            <Card key={seg.risk_segment} className="p-4 cursor-pointer hover:shadow-md transition" onClick={() => setSelectedRisk(seg.risk_segment === selectedRisk ? '' : seg.risk_segment)}>
              <div className="text-sm text-gray-500">{t(`analytics.risk_${seg.risk_segment}`)}</div>
              <div className="text-2xl font-bold">{seg.count}</div>
              <div className="text-xs text-gray-400">TB rủi ro: {parseFloat(seg.avg_probability).toFixed(1)}%</div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-2">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <DataTable data={predictions} columns={columns as any} />
        )}
      </Card>

      <div className="mt-4 text-sm text-gray-400">
        {t('analytics.churnDisclaimer')}
      </div>
    </div>
  );
}


