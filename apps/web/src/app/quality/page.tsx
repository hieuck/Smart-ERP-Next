'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AuthGuard from '@/components/layout/AuthGuard';
import { apiClient } from '@/lib/api-client';

export default function QualityPage() {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState([]);
  const [ncrs, setNCRs] = useState([]);
  const [report, setReport] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('inspections');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [inspRes, ncrRes] = await Promise.all([
        apiClient.get('/qms/inspections'),
        apiClient.get('/qms/ncrs'),
      ]);
      setInspections(inspRes.data || []);
      setNCRs(ncrRes.data || []);
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const reportRes = await apiClient.get('/qms/report', {
        params: { startDate: thirtyDaysAgo.toISOString(), endDate: today.toISOString() },
      });
      setReport(reportRes.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const VERDICT_COLORS: Record<string, string> = {
    pass: 'bg-green-100 text-green-800',
    fail: 'bg-red-100 text-red-800',
    conditional: 'bg-yellow-100 text-yellow-800',
  };

  const SEVERITY_COLORS: Record<string, string> = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">{t('qms.title')}</h1>

        {/* Quality Metrics */}
        {report && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-xs text-gray-500 uppercase">{t('qms.totalInspections')}</div>
              <div className="text-2xl font-bold">{report.totalInspections}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-xs text-gray-500 uppercase">{t('qms.pass')}</div>
              <div className="text-2xl font-bold text-green-600">{report.passed}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-xs text-gray-500 uppercase">{t('qms.fail')}</div>
              <div className="text-2xl font-bold text-red-600">{report.failed}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-xs text-gray-500 uppercase">{t('qms.passRate')}</div>
              <div className="text-2xl font-bold text-blue-600">{report.passRate?.toFixed(1) || 0}%</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {['inspections', 'ncrs', 'spc'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === 'inspections' ? t('qms.inspections') : tab === 'ncrs' ? t('qms.ncrs') : t('qms.spcCharts')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8">{t('common.loading')}</div>
        ) : activeTab === 'inspections' ? (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">{t('common.date')}</th>
                  <th className="px-4 py-3 text-left">{t('common.reference')}</th>
                  <th className="px-4 py-3 text-left">{t('qms.verdict')}</th>
                  <th className="px-4 py-3 text-left">{t('common.notes')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inspections.map((insp: any) => (
                  <tr key={insp.id}>
                    <td className="px-4 py-3">{new Date(insp.inspection_date).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3">{insp.reference_type} / {insp.reference_id}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${VERDICT_COLORS[insp.verdict] || ''}`}>
                        {t(`qms.${insp.verdict}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{insp.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {inspections.length === 0 && <div className="text-center text-gray-500 py-8">No inspections recorded</div>}
          </div>
        ) : activeTab === 'ncrs' ? (
          <div className="grid gap-4">
            {ncrs.map((ncr: any) => (
              <div key={ncr.id} className={`bg-white rounded-xl shadow p-4 border-l-4 ${
                ncr.severity === 'critical' ? 'border-red-500' : ncr.severity === 'high' ? 'border-orange-500' : 'border-yellow-500'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{ncr.code}</h3>
                    <p className="text-sm text-gray-600 mt-1">{ncr.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${SEVERITY_COLORS[ncr.severity] || ''}`}>
                    {ncr.severity}
                  </span>
                </div>
                {ncr.root_cause && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-500">{t('qms.rootCause')}: </span>
                    {ncr.root_cause}
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-400">
                  {new Date(ncr.reported_at).toLocaleString('vi-VN')} — {ncr.status}
                </div>
              </div>
            ))}
            {ncrs.length === 0 && <div className="text-center text-gray-500 py-8">No NCRs reported</div>}
          </div>
        ) : (
          /* SPC Charts placeholder */
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <h3 className="text-lg font-semibold mb-4">{t('qms.spcCharts')}</h3>
            <p className="text-gray-500">{t('qms.spcComingSoon')}</p>
            <p className="text-sm text-gray-400 mt-2">{t('qms.spcDescription')}</p>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}