'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/layout/AuthGuard';
import {
  ShoppingBag, Search, Plus, Eye, CheckCircle,
  XCircle, ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';

import { PageHeader } from '@smart-erp/shared';

interface PurchaseOrder {
  id: string;
  code: string;
  supplierId: string | null;
  status: string;
  total: string;
  paidAmount: string | null;
  paymentStatus: string;
  expectedDate: string | null;
  receivedAt: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = (t: (key: string) => string) => [
  { value: '', label: t('purchasing.all') },
  { value: 'draft', label: t('purchasing.draft') },
  { value: 'confirmed', label: t('purchasing.confirmed') },
  { value: 'partial_received', label: t('purchasing.partial') },
  { value: 'received', label: t('purchasing.received') },
  { value: 'cancelled', label: t('purchasing.cancelled') },
];

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  partial_received: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  received: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const formatVND = (v: string | null) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(v ?? '0'));

export default function PurchasingPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/purchasing', {
        params: { page, limit, search: search || undefined, status: statusFilter || undefined },
      });
      setOrders(res.data.items);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleConfirm = async (id: string) => {
    await apiClient.patch(`/purchasing/${id}/confirm`);
    fetchOrders();
  };

  const handleCancel = async (id: string) => {
    if (!confirm(t('common.confirmDeleteMessage'))) return;
    await apiClient.patch(`/purchasing/${id}/cancel`);
    fetchOrders();
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <PageHeader
          title={t('purchasing.title')}
          description={`${total} ${t('common.purchaseOrders')}`}
          icon={<ShoppingBag className="w-5 h-5" />}
          iconColor="indigo"
          actions={
            <button
              onClick={() => router.push('/purchasing/create')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              {t('purchasing.add')}
            </button>
          }
        />

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('purchasing.searchPlaceholder')}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm">
              {t('common.search')}
            </button>
          </form>
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="w-4 h-4 text-gray-400" />
            {STATUS_OPTIONS(t).map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setStatusFilter(opt.value); setPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  statusFilter === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t('common.loading')}
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('purchasing.code')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('purchasing.total')}</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t('purchasing.status')}</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t('payment.status.label')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('purchasing.expectedDate')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('purchasing.createdAt')}</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {orders.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">{t('common.noData')}</td></tr>
                    ) : orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-indigo-600">{order.code}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                          {formatVND(order.total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                            {STATUS_OPTIONS(t).find((s) => s.value === order.status)?.label ?? order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                            order.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {order.paymentStatus === 'paid' ? t('payment.status.paid') : order.paymentStatus === 'partial' ? t('payment.status.partial') : t('payment.status.unpaid')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-500">
                          {order.expectedDate ? new Date(order.expectedDate).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => router.push(`/purchasing/${order.id}`)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
                              title={t('common.viewDetails')}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {order.status === 'draft' && (
                              <button
                                onClick={() => handleConfirm(order.id)}
                                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition"
                                title={t('common.confirm')}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {['draft', 'confirmed'].includes(order.status) && (
                              <button
                                onClick={() => handleCancel(order.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                                title={t('common.cancel')}
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{total} {t('common.purchaseOrders', { count: total })}</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AuthGuard>
  );
}


