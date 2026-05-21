// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { customersApi, type Customer } from '@/lib/api-customers';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/layout/AuthGuard';
import {
  ArrowLeft, Edit, Users, Phone, Mail,
  MapPin, CreditCard, ShoppingBag, Star,
} from 'lucide-react';

const GROUP_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  retail: { label: 'Bán lẻ', color: 'text-gray-700', bg: 'bg-gray-100' },
  wholesale: { label: 'Bán sỉ', color: 'text-blue-700', bg: 'bg-blue-100' },
  vip: { label: 'VIP', color: 'text-yellow-700', bg: 'bg-yellow-100' },
};

const formatVND = (v: string | null | undefined) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(v ?? '0'));

export default function CustomerDetailPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      customersApi.getOne(id).then((r) => r.data),
      apiClient.get('/orders', { params: { limit: 5 } }).then((r) => r.data.items ?? []).catch(() => []),
    ])
      .then(([c, orders]) => {
        setCustomer(c);
        setRecentOrders(orders);
      })
      .catch(() => router.push('/customers'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center h-64 text-gray-400">
          <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {t('common.loading')}
        </div>
      </AuthGuard>
    );
  }

  if (!customer) return null;

  const groupInfo = GROUP_LABELS[customer.customerGroup ?? ''];
  const hasDebt = parseFloat(customer.currentDebt ?? '0') > 0;

  return (
    <AuthGuard>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/customers')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {customer.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{customer.name}</h1>
                  {groupInfo && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${groupInfo.bg} ${groupInfo.color}`}>
                      {groupInfo.label}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{customer.code}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push(`/customers/${id}/edit`)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <Edit className="w-4 h-4" />
            {t('actions.edit')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Contact + address */}
          <div className="lg:col-span-2 space-y-4">
            {/* Contact info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Thông tin liên hệ</h2>
              <div className="space-y-3">
                {customer.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-white">{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-white">{customer.email}</span>
                  </div>
                )}
                {(customer.address || customer.district || customer.province) && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-900 dark:text-white">
                      {[customer.address, customer.ward, customer.district, customer.province]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
                {customer.taxCode && (
                  <div className="flex items-center gap-3 text-sm">
                    <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-500">MST: </span>
                    <span className="text-gray-900 dark:text-white font-mono">{customer.taxCode}</span>
                  </div>
                )}
                {customer.contactPerson && (
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-500">Liên hệ: </span>
                    <span className="text-gray-900 dark:text-white">{customer.contactPerson}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Recent orders */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-gray-500" />
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Đơn hàng gần đây</h2>
                </div>
                <button onClick={() => router.push('/orders')} className="text-xs text-blue-600 hover:underline">
                  Xem tất cả →
                </button>
              </div>
              {recentOrders.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">{t('orders.empty')}</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => router.push(`/orders/${order.id}`)}>
                      <div>
                        <p className="text-sm font-mono font-bold text-blue-600">{order.code}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatVND(order.total)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Stats */}
          <div className="space-y-4">
            {/* Debt card */}
            <div className={`rounded-xl border p-5 ${hasDebt ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Công nợ hiện tại</p>
              <p className={`text-2xl font-bold ${hasDebt ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                {formatVND(customer.currentDebt)}
              </p>
              {customer.debtLimit && parseFloat(customer.debtLimit) > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Hạn mức: {formatVND(customer.debtLimit)}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tổng mua hàng</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                  {formatVND(customer.totalPurchased)}
                </p>
              </div>
              {customer.loyaltyPoints && parseFloat(customer.loyaltyPoints) > 0 && (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Điểm tích lũy</p>
                    <p className="text-base font-bold text-yellow-600">
                      {parseFloat(customer.loyaltyPoints).toLocaleString('vi-VN')} điểm
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {customer.notes && (
              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <span className="font-medium">Ghi chú: </span>{customer.notes}
                </p>
              </div>
            )}

            {/* Quick actions */}
            <button
              onClick={() => router.push(`/pos?customerId=${id}`)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              {t('orders.createButton')}
            </button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
