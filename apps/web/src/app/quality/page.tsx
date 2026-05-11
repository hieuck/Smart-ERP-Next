'use client';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, DataTable, Spinner, Tab, Tabs } from '@smart-erp/ui';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';
import { format } from 'date-fns';

export default function QualityPage() {
  const { t } = useTranslation('common');
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [defectCodes, setDefectCodes] = useState([]);
  const [report, setReport] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('inspections');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, inspectionsRes, codesRes] = await Promise.all([
        apiClient.get('/qms/plans'),
        apiClient.get('/qms/inspections'),
        apiClient.get('/qms/defect-codes'),
      ]);
      setPlans(plansRes.data);
      setInspections(inspectionsRes.data);
      setDefectCodes(codesRes.data);
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const reportRes = await apiClient.get('/qms/report', {
        params: { startDate: thirtyDaysAgo.toISOString(), endDate: today.toISOString() },
      });
      setReport(reportRes.data);
    } catch (err) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const inspectionColumns = [
    { key: 'inspection_date', label: t('qms.inspectionDate'), render: (v: string) => format(new Date(v), 'dd/MM/yyyy') },
    { key: 'reference_type', label: t('qms.referenceType'), render: (v: string) => t(`qms.referenceType_${v}`) },
    { key: 'reference_id', label: t('qms.referenceId') },
    { key: 'verdict', label: t('qms.verdict'), render: (v: string) => {
      const variant = v === 'pass' ? 'success' : v === 'fail' ? 'danger' : 'warning';
      return <span className={`badge badge-${variant}`}>{t(`qms.verdict_${v}`)}</span>;
    } },
    { key: 'notes', label: t('common.notes') },
  ];

  const planColumns = [
    { key: 'name', label: t('qms.planName') },
    { key: 'product_id', label: t('products.name') },
    { key: 'type', label: t('qms.inspectionType'), render: (v: string) => t(`qms.type_${v}`) },
    { key: 'aql', label: 'AQL' },
  ];

  if (loading) return <div className="p-8 flex justify-center"><Spinner /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('qms.title')}</h1>

      {/* Quality metrics cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="text-sm text-gray-500">{t('qms.totalInspections')}</div>
            <div className="text-2xl font-bold">{report.totalInspections}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">{t('qms.passed')}</div>
            <div className="text-2xl font-bold text-green-600">{report.passed}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">{t('qms.failed')}</div>
            <div className="text-2xl font-bold text-red-600">{report.failed}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">{t('qms.passRate')}</div>
            <div className="text-2xl font-bold text-blue-600">{report.passRate.toFixed(1)}%</div>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab value="inspections" label={t('qms.inspections')} />
        <Tab value="plans" label={t('qms.inspectionPlans')} />
        <Tab value="defects" label={t('qms.defectCodes')} />
      </Tabs>

      <div className="mt-4">
        {activeTab === 'inspections' && <DataTable data={inspections} columns={inspectionColumns} />}
        {activeTab === 'plans' && <DataTable data={plans} columns={planColumns} />}
        {activeTab === 'defects' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {defectCodes.map((code: any) => (
              <Card key={code.id} className="p-3">
                <div className="font-bold">{code.code}</div>
                <div className="text-sm">{code.name}</div>
                <div className="text-xs text-gray-400">{t(`qms.severity_${code.severity}`)}</div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-400">
        {t('qms.disclaimer')}
      </div>
    </div>
  );
}
