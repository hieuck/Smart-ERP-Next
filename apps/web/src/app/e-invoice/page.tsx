// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText, Send, XCircle, CheckCircle,
  Plus, Download, Search, Clock, ExternalLink,
} from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';
import { apiClient } from '@/lib/api-client';
import { Card, Button, Badge, DataTable, StatCard } from '@smart-erp/ui';

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

const STATUS_CONFIG = {
  draft:     { variant: 'secondary' as const, label: 'Nháp',        icon: <Clock /> },
  signed:    { variant: 'primary' as const,   label: 'Đã ký',       icon: <CheckCircle /> },
  issued:    { variant: 'success' as const,   label: 'Đã phát hành', icon: <Send /> },
  cancelled: { variant: 'danger' as const,    label: 'Đã hủy',      icon: <XCircle /> },
  replaced:  { variant: 'secondary' as const, label: 'Đã thay thế', icon: <FileText /> },
  adjusted:  { variant: 'warning' as const,   label: 'Điều chỉnh',  icon: <FileText /> },
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
    { key: 'all',      label: t('orders.statusAll') || 'Tất cả' },
    { key: 'draft',    label: STATUS_CONFIG.draft.label },
    { key: 'issued',   label: STATUS_CONFIG.issued.label },
    { key: 'cancelled',label: STATUS_CONFIG.cancelled.label },
  ];

  const columns = [
    {
      header: t('einvoice.invoiceNumber') || 'Số hóa đơn',
      accessor: (row: EInvoice) => (
        <div>
          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
            {row.invoiceNumber ? `${row.invoiceSeries}/${row.invoiceNumber}` : '--'}
          </span>
          <div className="text-xs text-gray-400 mt-0.5">{PROVIDER_LABELS[row.provider] || row.provider}</div>
        </div>
      ),
    },
    {
      header: t('einvoice.buyer') || 'Người mua',
      accessor: (row: EInvoice) => (
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">{row.buyerName}</div>
          {row.buyerTaxCode ? (
            <div className="text-xs text-gray-400 font-mono">{row.buyerTaxCode}</div>
          ) : null}
        </div>
      ),
    },
    {
      header: t('einvoice.totalAmount') || 'Tổng tiền',
      accessor: (row: EInvoice) => (
        <div>
          <div className="font-bold text-gray-900 dark:text-white">{formatVND(row.totalAmount)}</div>
          <div className="text-xs text-gray-400">VAT: {formatVND(row.vatAmount)}</div>
        </div>
      ),
    },
    {
      header: t('einvoice.status') || 'Trạng thái',
      accessor: (row: EInvoice) => {
        const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.draft;
        return <Badge variant={cfg.variant} icon={cfg.icon}>{cfg.label}</Badge>;
      },
    },
    {
      header: t('einvoice.issuedAt') || 'Ngày phát hành',
      accessor: (row: EInvoice) => row.issuedAt
        ? new Date(row.issuedAt).toLocaleDateString('vi-VN')
        : <span className="text-gray-400">-</span>,
    },
    {
      header: t('common.actions') || 'Thao tác',
      accessor: (row: EInvoice) => (
        <div className="flex items-center gap-1">
          {row.status === 'draft' ? (
            <Button
              size="sm"
              variant="primary"
              icon={<Send />}
              loading={actionLoading === row.id}
              onClick={() => handleIssue(row.id)}
            >
              {t('einvoice.issue') || 'Phát hành'}
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
              {t('einvoice.view') || 'Xem'}
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('einvoice.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('einvoice.subtitle') || 'Quản lý hóa đơn theo Nghị định 123/2020/NĐ-CP — tích hợp VNPT, Viettel, MISA'}
            </p>
          </div>
          <Button icon={<Plus />} variant="primary">
            {t('einvoice.create') || 'Tạo hóa đơn'}
          </Button>
        </div>

        {/* Stats */}
        {stats ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <StatCard
              title={t('einvoice.stats.issued') || 'Đã phát hành'}
              value={stats.issued_count || 0}
              icon={<Send className="w-5 h-5 text-green-500" />}
              className="border-l-4 border-l-green-500"
            />
            <StatCard
              title={t('einvoice.stats.draft') || 'Bản nháp'}
              value={stats.draft_count || 0}
              icon={<Clock className="w-5 h-5 text-gray-400" />}
            />
            <StatCard
              title={t('einvoice.stats.cancelled') || 'Đã hủy'}
              value={stats.cancelled_count || 0}
              icon={<XCircle className="w-5 h-5 text-red-400" />}
            />
            <StatCard
              title={t('einvoice.stats.revenue') || 'Doanh thu'}
              value={formatVND(stats.total_revenue || 0)}
              icon={<FileText className="w-5 h-5 text-blue-500" />}
              className="border-l-4 border-l-blue-500"
            />
            <StatCard
              title={t('einvoice.stats.vat') || 'Tổng VAT'}
              value={formatVND(stats.total_vat || 0)}
              icon={<FileText className="w-5 h-5 text-purple-500" />}
            />
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
        <Card className="shadow-sm border-gray-200 dark:border-gray-800">
          <DataTable
            data={filteredInvoices}
            columns={columns}
            loading={loading}
            emptyMessage={t('einvoice.noInvoices') || 'Chưa có hóa đơn nào'}
          />
        </Card>
      </div>
    </AuthGuard>
  );
}

