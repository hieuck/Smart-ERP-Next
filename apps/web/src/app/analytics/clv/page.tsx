'use client';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Spinner, DataTable, Badge } from '@smart-erp/ui';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';

interface Prediction {
  name: string;
  email: string;
  phone: string;
  total_spent: number;
  avg_order_value: number;
  purchase_frequency: number;
  recency_days: number;
  predicted_clv: number;
  segment: string;
  confidence_score: number;
}

export default function ClvPage() {
  const { t } = useTranslation('common');
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [computing, setComputing] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const predRes = await apiClient.get('/analytics/clv/predictions', { params: { segment: selectedSegment || undefined } });
      setPredictions(predRes.data);
      const sumRes = await apiClient.get('/analytics/clv/summary');
      setSummary(sumRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load CLV data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSegment]);

  const handleCompute = async () => {
    setComputing(true);
    try {
      await apiClient.post('/analytics/clv/compute');
      toast.success(t('analytics.clvComputeSuccess'));
      await fetchData();
    } catch (err) {
      toast.error(t('analytics.clvComputeFailed'));
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
    { key: 'avg_order_value', label: t('analytics.avgOrderValue'), render: (v: number) => formatCurrency(v) },
    { key: 'purchase_frequency', label: t('analytics.purchaseFrequency'), render: (v: number) => v.toFixed(2) + ' /tháng' },
    { key: 'recency_days', label: t('analytics.recencyDays'), render: (v: number) => v + ' ' + t('common.days') },
    { key: 'predicted_clv', label: t('analytics.predictedClv'), render: (v: number) => formatCurrency(v) },
    { key: 'segment', label: t('analytics.segment'), render: (v: string) => <Badge variant={v === 'vip' ? 'success' : v === 'at_risk' ? 'danger' : 'info'}>{t(`analytics.segment_${v}`)}</Badge> },
    { key: 'confidence_score', label: t('analytics.confidenceScore'), render: (v: number) => v + '%' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('analytics.customerLifetimeValue')}</h1>
        <Button onClick={handleCompute} disabled={computing}>
          {computing ? t('common.processing') : t('analytics.runClv')}
        </Button>
      </div>

      {/* Segmentation summary cards */}
      {summary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {summary.map((seg: any) => (
            <Card key={seg.segment} className="p-4 cursor-pointer hover:shadow-md transition" onClick={() => setSelectedSegment(seg.segment === selectedSegment ? '' : seg.segment)}>
              <div className="text-sm text-gray-500">{t(`analytics.segment_${seg.segment}`)}</div>
              <div className="text-2xl font-bold">{seg.count}</div>
              <div className="text-xs text-gray-400">∑ {formatCurrency(seg.total_clv)}</div>
              <div className="text-xs">TB {formatCurrency(seg.avg_clv)}</div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-2">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <DataTable data={predictions} columns={columns} />
        )}
      </Card>

      <div className="mt-4 text-sm text-gray-400">
        {t('analytics.clvDisclaimer')}
      </div>
    </div>
  );
}
