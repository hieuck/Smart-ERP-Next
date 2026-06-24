
'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText, Send, XCircle, CheckCircle,
  Plus, Download, Search, Clock, ExternalLink,
} from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';
import { apiClient } from '@/lib/api-client';
import { Button, DataTable } from '@smart-erp/shared';

interface EInvoice {
  id: string;
  invoiceNumber: string | null;
  invoiceSeries: string;
  buyerName: string;
  buyerTaxCode: string | null;
  totalAmount: string;
  vatAmount: string;
  status: 'draft' | 'signed' | 'issued' | 'cancelled' | 'replaced' | 'adjusted';
  issuedAt: string | null;
  createdAt: string;
  provider: string;
  viewUrl: string | null;
  pdfUrl: string | null;
  lookupCode: string | null;
}

interface Stats {
  issued_count: number;
  draft_count: number;
  cancelled_count: number;
  total_revenue: string;
  total_vat: string;
}

type StatusVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'error';

const STATUS_CONFIG: Record<string, { variant: StatusVariant; label: string; icon: React.ReactNode }> = {
  draft:     { variant: 'secondary', label: 'Nháp',        icon: <Clock /> },
  signed:    { variant: 'primary',   label: 'Đã ký',       icon: <CheckCircle /> },
  issued:    { variant: 'success',   label: 'Đã phát hành', icon: <Send /> },
  cancelled: { variant: 'danger',    label: 'Đã hủy',      icon: <XCircle /> },
  replaced:  { variant: 'secondary', label: 'Đã thay thế', icon: <FileText /> },
  adjusted:  { variant: 'warning',   label: 'Điều chỉnh',  icon: <FileText /> },
};

const PROVIDER_LABELS: Record<string, string> = {
  vnpt:        'VNPT e-Invoice',
  viettel:     'Viettel e-Invoice',
  misa:        'MISA e-Invoice',
  easy_invoice:'Easy Invoice',
  bkav:        'BKAV Invoice',
};

const asArray = <T,>(value: any): T[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

export default function EInvoicePage() {
  const { t } = useTranslation('common');
  const [invoices, setInvoices] = useState<EInvoice[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [invRes, statsRes] = await Promise.all([
        apiClient.get<any>('/e-invoice'),
        apiClient.get<any>('/e-invoice/stats/monthly'),
      ]);
      setInvoices(asArray<EInvoice>(invRes.data));
      setStats(statsRes.data || null);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async (id: string) => {
    setActionLoading(id);
    try {
      await apiClient.patch(`/e-invoice/${id}/issue`, {});
      await fetchAll();
    } finally {
      setActionLoading(null);
    }
  };

  const formatVND = (v: string | number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));

  const filteredInvoices = statusFilter === 'all'
    ? invoices
    : invoices.filter(i => i.status === statusFilter);

  const STATUS_FILTERS = [
    { key: 'all',      label: t('orders.statusAll')  },
    { key: 'draft',    label: STATUS_CONFIG.draft.label },
    { key: 'issued',   label: STATUS_CONFIG.issued.label },
    { key: 'cancelled',label: STATUS_CONFIG.cancelled.label },
  ];

  const columns = [
    {
      key: 'invoiceNumber',
      label: t('einvoice.invoiceNumber'),
      render: (row: EInvoice) => (
        <div>
          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
            {row.invoiceNumber ? `${row.invoiceSeries}/${row.invoiceNumber}` : '--'}
          </span>
          <div className="text-xs text-gray-400 mt-0.5">{PROVIDER_LABELS[row.provider] || row.provider}</div>
        </div>
      ),
    },
    {
      key: 'buyer',
      label: t('einvoice.buyer'),
      render: (row: EInvoice) => (
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">{row.buyerName}</div>
          {row.buyerTaxCode ? (
            <div className="text-xs text-gray-400 font-mono">{row.buyerTaxCode}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'totalAmount',
      label: t('einvoice.totalAmount'),
      render: (row: EInvoice) => (
        <div>
          <div className="font-bold text-gray-900 dark:text-white">{formatVND(row.totalAmount)}</div>
          <div className="text-xs text-gray-400">VAT: {formatVND(row.vatAmount)}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: t('einvoice.status'),
      render: (row: EInvoice) => {
        const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.draft;
        return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.variant === 'primary' || cfg.variant === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : cfg.variant === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : cfg.variant === 'danger' || cfg.variant === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>{cfg.icon}{cfg.label}</span>;
      },
    },
    {
      key: 'issuedAt',
      label: t('einvoice.issuedAt'),
      render: (row: EInvoice) => row.issuedAt
        ? new Date(row.issuedAt).toLocaleDateString('vi-VN')
        : <span className="text-gray-400">-</span>,
    },
    {
      key: 'actions',
      label: t('common.actions'),
      render: (row: EInvoice) => (
        <div className="flex items-center gap-1">
          {row.status === 'draft' ? (
            <Button
              size="sm"
              variant="primary"
              icon={<Send />}
              loading={actionLoading === row.id}
              onClick={() => handleIssue(row.id)}
            >
              {t('einvoice.issue')}
            </Button>
          ) : null}
          {row.pdfUrl ? (
            <Button
              size="sm"
              variant="outline"
              icon={<Download />}
              onClick={() => window.open(row.pdfUrl!, '_blank')}
            >
              PDF
            </Button>
          ) : null}
          {row.viewUrl ? (
            <Button
              size="sm"
              variant="outline"
              icon={<ExternalLink />}
              onClick={() => window.open(row.viewUrl!, '_blank')}
            >
              {t('einvoice.view')}
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('einvoice.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('einvoice.subtitle') }
            </p>
          </div>
          <Button icon={<Plus />} variant="primary">
            {t('einvoice.create') }
          </Button>
        </div>

        {/* Stats */}
        {stats ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { title: t('einvoice.stats.issued') , value: stats.issued_count || 0 },
              { title: t('einvoice.stats.draft') , value: stats.draft_count || 0 },
              { title: t('einvoice.stats.cancelled') , value: stats.cancelled_count || 0 },
              { title: t('einvoice.stats.revenue') , value: formatVND(stats.total_revenue || 0) },
              { title: t('einvoice.stats.vat') , value: formatVND(stats.total_vat || 0) },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.title}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                statusFilter === f.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <DataTable
            data={filteredInvoices}
            columns={columns}
            loading={loading}
            emptyMessage={t('einvoice.noInvoices') }
          />
        </div>
      </div>
    </AuthGuard>
  );
}

