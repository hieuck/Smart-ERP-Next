// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/layout/AuthGuard';
import {
  ArrowLeft, Edit, Truck, Phone, Mail,
  MapPin, CreditCard, Building2, ClipboardList,
} from 'lucide-react';

const formatVND = (v: string | null | undefined) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(v ?? '0'));

export default function SupplierDetailPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [supplier, setSupplier] = useState<any>(null);
  const [recentPOs, setRecentPOs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get(`/suppliers/${id}`).then((r) => r.data),
      apiClient.get('/purchasing', { params: { limit: 5 } }).then((r) => r.data.items ?? []).catch(() => []),
    ])
      .then(([s, pos]) => {
        setSupplier(s);
        setRecentPOs(pos);
      })
      .catch(() => router.push('/suppliers'))
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

  if (!supplier) return null;

  const hasDebt = parseFloat(supplier.currentDebt ?? '0') > 0;

  return (
    <AuthGuard>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/suppliers')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                <Truck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{supplier.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{supplier.code}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push(`/suppliers/${id}/edit`)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <Edit className="w-4 h-4" />
            {t('actions.edit')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Contact info + recent POs */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Thông tin liên hệ</h2>
              <div className="space-y-3">
                {supplier.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-white">{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-white">{supplier.email}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-900 dark:text-white">
                      {[supplier.address, supplier.district, supplier.province].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {supplier.taxCode && (
                  <div className="flex items-center gap-3 text-sm">
                    <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-500">MST: </span>
                    <span className="text-gray-900 dark:text-white font-mono">{supplier.taxCode}</span>
                  </div>
                )}
                {supplier.contactPerson && (
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-500">Liên hệ: </span>
                    <span className="text-gray-900 dark:text-white">{supplier.contactPerson}</span>
                  </div>
                )}
                {(supplier.bankAccount || supplier.bankName) && (
                  <div className="flex items-center gap-3 text-sm">
                    <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-white">
                      {supplier.bankAccount} — {supplier.bankName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Recent purchase orders */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-gray-500" />
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Đơn nhập gần đây</h2>
                </div>
                <button onClick={() => router.push('/purchasing')} className="text-xs text-blue-600 hover:underline">
                  Xem tất cả →
                </button>
              </div>
              {recentPOs.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">Chưa có đơn nhập</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {recentPOs.map((po) => (
                    <div key={po.id}
                      className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => router.push(`/purchasing/${po.id}`)}>
                      <div>
                        <p className="text-sm font-mono font-bold text-indigo-600">{po.code}</p>
                        <p className="text-xs text-gray-400">{new Date(po.createdAt).toLocaleDateString('vi-VN')}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatVND(po.total)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Stats */}
          <div className="space-y-4">
            <div className={`rounded-xl border p-5 ${hasDebt ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Công nợ hiện tại</p>
              <p className={`text-2xl font-bold ${hasDebt ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                {formatVND(supplier.currentDebt)}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tổng nhập hàng</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                  {formatVND(supplier.totalPurchased)}
                </p>
              </div>
              {supplier.paymentTermDays && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Thời hạn thanh toán</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                    {supplier.paymentTermDays} ngày
                  </p>
                </div>
              )}
            </div>

            {supplier.notes && (
              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <span className="font-medium">Ghi chú: </span>{supplier.notes}
                </p>
              </div>
            )}

            <button
              onClick={() => router.push(`/purchasing/create?supplierId=${id}`)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
            >
              <ClipboardList className="w-4 h-4" />
              Tạo đơn nhập
            </button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
