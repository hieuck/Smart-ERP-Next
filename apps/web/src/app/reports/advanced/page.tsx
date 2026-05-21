// @ts-nocheck
'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';

interface DateRange {
  from: string;
  to: string;
}

type ExportFormat = 'pdf' | 'excel' | 'csv';

export default function AdvancedReportsDashboard() {
  const { t } = useTranslation('common');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [activeReport, setActiveReport] = useState<string>('revenue');
  const [loading, setLoading] = useState(false);

  const reports = [
    { key: 'revenue', label: t('reports.revenue') },
    { key: 'profit', label: t('reports.profit') },
    { key: 'top-products', label: t('reports.topProducts') },
    { key: 'customers', label: t('reports.customers') },
    { key: 'inventory', label: t('reports.inventory') },
    { key: 'clv', label: t('analytics.clv') },
  ];

  const handleExport = async (format: ExportFormat) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to,
        format,
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/reports/${activeReport}/export?${params}`,
        { headers: { Authorization: `Bearer ${(typeof window !== 'undefined' ? localStorage.getItem('token') : null)}` } }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${activeReport}-${dateRange.from}-${dateRange.to}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('pdf')}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50"
          >
            {t('actions.export')} PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50"
          >
            {t('actions.export')} Excel
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
          >
            {t('actions.export')} CSV
          </button>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-4">
        <span className="text-sm font-medium">{t('reports.dateRange')}:</span>
        <input
          type="date"
          value={dateRange.from}
          onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
          className="border rounded px-3 py-1 text-sm"
        />
        <span>→</span>
        <input
          type="date"
          value={dateRange.to}
          onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
          className="border rounded px-3 py-1 text-sm"
        />
      </div>

      {/* Report Tabs */}
      <div className="flex gap-2 flex-wrap">
        {reports.map((report) => (
          <button
            key={report.key}
            onClick={() => setActiveReport(report.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeReport === report.key
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border'
            }`}
          >
            {report.label}
          </button>
        ))}
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-lg p-6 shadow-sm min-h-[400px]">
        <p className="text-gray-500 text-center mt-20">{t('common.noData')}</p>
        <p className="text-center text-sm text-gray-400 mt-2">
          {t('reports.generatedAt')}: {new Date().toLocaleString('vi-VN')}
        </p>
      </div>
    </div>
  );
}
