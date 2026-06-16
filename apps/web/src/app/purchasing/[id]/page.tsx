'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/layout/AuthGuard';
import { ArrowLeft, CheckCircle, XCircle, Package, Truck } from 'lucide-react';

interface POItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  unit: string;
  orderedQty: number;
  receivedQty: number;
  unitCost: string;
  lineTotal: string;
}

interface PurchaseOrder {
  id: string;
  code: string;
  supplierId: string | null;
  status: string;
  subtotal: string;
  total: string;
  paidAmount: string | null;
  paymentStatus: string;
  expectedDate: string | null;
  receivedAt: string | null;
  notes: string | null;
  createdAt: string;
  items: POItem[];
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Nháp', color: '#6b7280', bg: '#f3f4f6' },
  confirmed: { label: 'Đã xác nhận', color: '#2563eb', bg: '#dbeafe' },
  partial_received: { label: 'Nhận một phần', color: '#d97706', bg: '#fef3c7' },
  received: { label: 'Đã nhận hàng', color: '#059669', bg: '#d1fae5' },
  cancelled: { label: 'Đã hủy', color: '#dc2626', bg: '#fee2e2' },
};

const formatVND = (v: string | null) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(v ?? '0'));

export default function PurchaseOrderDetailPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Receive modal
  const [showReceive, setShowReceive] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});

  const fetchPO = useCallback(async () => {
    const res = await apiClient.get(`/purchasing/${id}`);
    setPo(res.data);
    // Init receive qtys
    const qtys: Record<string, number> = {};
    (res.data.items ?? []).forEach((item: POItem) => {
      qtys[item.id] = item.orderedQty - item.receivedQty;
    });
    setReceiveQtys(qtys);
  }, [id]);

  useEffect(() => {
    fetchPO()
      .catch(() => router.push('/purchasing'))
      .finally(() => setLoading(false));
  }, [fetchPO, router]);

  const handleConfirm = async () => {
    setUpdating(true);
    try {
      await apiClient.patch(`/purchasing/${id}/confirm`);
      await fetchPO();
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Bạn có chắc muốn hủy đơn nhập này?')) return;
    setUpdating(true);
    try {
      await apiClient.patch(`/purchasing/${id}/cancel`);
      await fetchPO();
    } finally {
      setUpdating(false);
    }
  };

  const handleReceive = async () => {
    setUpdating(true);
    try {
      const items = Object.entries(receiveQtys)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, receivedQty]) => ({ itemId, receivedQty }));
      await apiClient.post(`/purchasing/${id}/receive`, { items });
      setShowReceive(false);
      await fetchPO();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Nhận hàng thất bại');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !po) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center h-64 text-gray-400">
          <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Đang tải...
        </div>
      </AuthGuard>
    );
  }

  const statusInfo = STATUS_LABELS[po.status] ?? { label: po.status, color: '#6b7280', bg: '#f3f4f6' };

  return (
    <AuthGuard>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/purchasing')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white font-mono">{po.code}</h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                  {statusInfo.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {new Date(po.createdAt).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {po.status === 'draft' && (
              <button onClick={handleConfirm} disabled={updating}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                <CheckCircle className="w-4 h-4" />
                Xác nhận
              </button>
            )}
            {['confirmed', 'partial_received'].includes(po.status) && (
              <button onClick={() => setShowReceive(true)} disabled={updating}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50">
                <Truck className="w-4 h-4" />
                Nhận hàng
              </button>
            )}
            {['draft', 'confirmed'].includes(po.status) && (
              <button onClick={handleCancel} disabled={updating}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50">
                <XCircle className="w-4 h-4" />
                Hủy
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Sản phẩm ({po.items.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">SL đặt</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Đã nhận</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Giá nhập</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {po.items.map((item) => {
                      const fullyReceived = item.receivedQty >= item.orderedQty;
                      return (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
                            <p className="text-xs text-gray-400 font-mono">{item.productSku}</p>
                          </td>
                          <td className="px-4 py-3 text-right">{item.orderedQty}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={fullyReceived ? 'text-green-600 font-medium' : 'text-yellow-600'}>
                              {item.receivedQty}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500">{formatVND(item.unitCost)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                            {formatVND(item.lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Tổng kết</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Tạm tính</span>
                  <span>{formatVND(po.subtotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span>Tổng cộng</span>
                  <span className="text-indigo-600">{formatVND(po.total)}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Đã thanh toán</span>
                  <span className="text-green-600">{formatVND(po.paidAmount)}</span>
                </div>
              </div>
              {po.expectedDate && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-sm">
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Ngày dự kiến</span>
                    <span>{new Date(po.expectedDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              )}
              {po.receivedAt && (
                <div className="mt-2 text-sm">
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Ngày nhận hàng</span>
                    <span className="text-green-600">{new Date(po.receivedAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              )}
            </div>

            {po.notes && (
              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <span className="font-medium">Ghi chú: </span>{po.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Receive modal */}
      {showReceive && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Nhận hàng</h2>
            <div className="space-y-3 max-h-72 overflow-y-auto mb-4">
              {po.items.filter((i) => i.receivedQty < i.orderedQty).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.productName}</p>
                    <p className="text-xs text-gray-400">Đặt: {item.orderedQty} · Đã nhận: {item.receivedQty}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Nhận:</span>
                    <input
                      type="number"
                      value={receiveQtys[item.id] ?? 0}
                      onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [item.id]: parseInt(e.target.value) || 0 }))}
                      min={0}
                      max={item.orderedQty - item.receivedQty}
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowReceive(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm">
                Hủy
              </button>
              <button onClick={handleReceive} disabled={updating}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition text-sm disabled:opacity-50">
                {updating ? 'Đang xử lý...' : 'Xác nhận nhận hàng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
