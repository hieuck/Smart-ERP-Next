'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ordersApi, type Order } from '@/lib/api-orders';
import AuthGuard from '@/components/layout/AuthGuard';
import { ShoppingBag, Search, Plus, Eye, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

import { PageHeader } from '@smart-erp/shared';

const ORDER_STATUS_OPTIONS = [
  { value: '', labelKey: 'orders.statusAll' },
  { value: 'draft', labelKey: 'orders.status.draft' },
  { value: 'confirmed', labelKey: 'orders.status.confirmed' },
  { value: 'processing', labelKey: 'orders.status.processing' },
  { value: 'shipped', labelKey: 'orders.status.shipped' },
  { value: 'delivered', labelKey: 'orders.status.delivered' },
  { value: 'cancelled', labelKey: 'orders.status.cancelled' },
];

const ORDER_PAYMENT_STATUS_OPTIONS = [
  { value: '', labelKey: 'orders.statusAll' },
  { value: 'unpaid', labelKey: 'payment.status.unpaid' },
  { value: 'partial', labelKey: 'payment.status.partial' },
  { value: 'paid', labelKey: 'payment.status.paid' },
];

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  returned: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const paymentStatusColors: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-700',
  partial: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
};

const channelLabelKeys: Record<string, string> = {
  pos: 'orders.channels.pos',
  online: 'orders.channels.online',
  phone: 'orders.channels.phone',
  wholesale: 'orders.channels.wholesale',
};

const formatVND = (v: string | null) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
    parseFloat(v ?? '0')
  );

export default function OrdersPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const statusOptions = ORDER_STATUS_OPTIONS.map((option) => ({
    ...option,
    label: t(option.labelKey),
  }));
  const paymentStatusOptions = ORDER_PAYMENT_STATUS_OPTIONS.map((option) => ({
    ...option,
    label: t(option.labelKey),
  }));
  const channelLabels = Object.fromEntries(
    Object.entries(channelLabelKeys).map(([channel, labelKey]) => [channel, t(labelKey)])
  ) as Record<string, string>;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ordersApi.getAll({
        page,
        limit,
        search: search || undefined,
        status: statusFilter || undefined,
        paymentStatus: paymentFilter || undefined,
      });
      setOrders(res.items);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, [page, paymentFilter, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <PageHeader
          title={t('orders.title')}
          description={`${total} ${t('common.orders')}`}
          icon={<ShoppingBag className="w-5 h-5" />}
          iconColor="blue"
          actions={
            <button
              onClick={() => router.push('/pos')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              {t('orders.createOrder')}
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
                placeholder={t('orders.searchPlaceholder')}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm">
              {t('actions.search.title')}
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">{t('orders.statusLabel')}:</span>
            </div>
            {statusOptions.map((opt) => (
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
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">{t('payment.status.label')}:</span>
            </div>
            {paymentStatusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setPaymentFilter(opt.value); setPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  paymentFilter === opt.value
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('orders.code')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('orders.channelLabel')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('orders.total')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('orders.debt')}</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('orders.statusLabel')}</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('orders.paymentStatus')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('orders.date')}</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                          {t('common.noData')}
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-blue-600">{order.code}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                            {channelLabels[order.channel] ?? order.channel}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                            {formatVND(order.total)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={parseFloat(order.debtAmount ?? '0') > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                              {formatVND(order.debtAmount)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                              {statusOptions.find((s) => s.value === order.status)?.label ?? t(`orders.status.${order.status}`, { defaultValue: order.status })}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${paymentStatusColors[order.paymentStatus] ?? 'bg-gray-100 text-gray-700'}`}>
                              {paymentStatusOptions.find((s) => s.value === order.paymentStatus)?.label ?? order.paymentStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-400">
                            {new Date(order.createdAt).toLocaleString('vi-VN', {
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => router.push(`/orders/${order.id}`)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
                              title={t('common.viewDetails')}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('common.showing')} {(page - 1) * limit + 1}–{Math.min(page * limit, total)} {t('common.of')} {total}
                </p>
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


