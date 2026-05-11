'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ordersApi, type Order } from '@/lib/api-orders';
import AuthGuard from '@/components/layout/AuthGuard';
import {
  ArrowLeft, ShoppingBag, User, CreditCard,
  Package, CheckCircle, XCircle, Truck,
} from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Nháp', color: '#6b7280', bg: '#f3f4f6' },
  confirmed: { label: 'Đã xác nhận', color: '#2563eb', bg: '#dbeafe' },
  processing: { label: 'Đang xử lý', color: '#d97706', bg: '#fef3c7' },
  shipped: { label: 'Đã giao vận', color: '#7c3aed', bg: '#ede9fe' },
  delivered: { label: 'Đã giao hàng', color: '#059669', bg: '#d1fae5' },
  cancelled: { label: 'Đã hủy', color: '#dc2626', bg: '#fee2e2' },
  returned: { label: 'Đã trả hàng', color: '#ea580c', bg: '#ffedd5' },
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: 'Chưa thanh toán',
  partial: 'Thanh toán một phần',
  paid: 'Đã thanh toán',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  card: 'Thẻ',
  momo: 'MoMo',
  vnpay: 'VNPay',
  zalopay: 'ZaloPay',
  credit: 'Công nợ',
};

const CHANNEL_LABELS: Record<string, string> = {
  pos: 'Tại quầy',
  online: 'Online',
  phone: 'Điện thoại',
  wholesale: 'Bán sỉ',
};

const formatVND = (v: string | null | undefined) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(v ?? '0'));

const NEXT_STATUS: Record<string, { status: string; label: string; icon: React.ReactNode }[]> = {
  draft: [
    { status: 'confirmed', label: 'Xác nhận', icon: <CheckCircle className="w-4 h-4" /> },
    { status: 'cancelled', label: 'Hủy đơn', icon: <XCircle className="w-4 h-4" /> },
  ],
  confirmed: [
    { status: 'processing', label: 'Xử lý', icon: <Package className="w-4 h-4" /> },
    { status: 'cancelled', label: 'Hủy đơn', icon: <XCircle className="w-4 h-4" /> },
  ],
  processing: [
    { status: 'shipped', label: 'Giao vận', icon: <Truck className="w-4 h-4" /> },
    { status: 'cancelled', label: 'Hủy đơn', icon: <XCircle className="w-4 h-4" /> },
  ],
  shipped: [
    { status: 'delivered', label: 'Đã giao', icon: <CheckCircle className="w-4 h-4" /> },
    { status: 'returned', label: 'Trả hàng', icon: <XCircle className="w-4 h-4" /> },
  ],
};

export default function OrderDetailPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    ordersApi.getOne(id)
      .then((res) => setOrder(res.data))
      .catch(() => router.push('/orders'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (status: string) => {
    if (!order) return;
    const cancelReason = status === 'cancelled'
      ? prompt('Lý do hủy đơn (tùy chọn):') ?? undefined
      : undefined;
    setUpdating(true);
    try {
      const res = await ordersApi.updateStatus(id, status, cancelReason);
      setOrder((prev) => prev ? { ...prev, ...res.data } : null);
    } catch (err: any) {
      alert(err.response?.data?.message ?? t('orders.updateFailed'));
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
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

  if (!order) return null;

  const statusInfo = STATUS_LABELS[order.status] ?? { label: order.status, color: '#6b7280', bg: '#f3f4f6' };
  const nextActions = NEXT_STATUS[order.status] ?? [];

  return (
    <AuthGuard>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/orders')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                  {order.code}
                </h1>
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
                >
                  {statusInfo.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {CHANNEL_LABELS[order.channel] ?? order.channel} ·{' '}
                {new Date(order.createdAt).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          {nextActions.length > 0 && (
            <div className="flex gap-2">
              {nextActions.map((action) => (
                <button
                  key={action.status}
                  onClick={() => handleStatusChange(action.status)}
                  disabled={updating}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                    action.status === 'cancelled'
                      ? 'border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Order items */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Sản phẩm ({order.items?.length ?? 0})
                </h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {(order.items ?? []).map((item) => (
                  <div key={item.id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.productName}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{item.productSku}</p>
                      {item.notes && (
                        <p className="text-xs text-gray-400 mt-1 italic">{item.notes}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatVND(item.lineTotal)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatVND(item.unitPrice)} × {item.quantity} {item.unit}
                      </p>
                      {parseFloat(item.discountAmount ?? '0') > 0 && (
                        <p className="text-xs text-green-600">-{formatVND(item.discountAmount)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <span className="font-medium">Ghi chú: </span>{order.notes}
                </p>
              </div>
            )}

            {/* Cancel reason */}
            {order.cancelReason && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <p className="text-sm text-red-700 dark:text-red-400">
                  <span className="font-medium">Lý do hủy: </span>{order.cancelReason}
                </p>
              </div>
            )}
          </div>

          {/* Right: Summary */}
          <div className="space-y-4">
            {/* Payment summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Thanh toán</h2>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Tạm tính</span>
                  <span>{formatVND(order.subtotal)}</span>
                </div>
                {parseFloat(order.discountAmount ?? '0') > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Giảm giá</span>
                    <span>-{formatVND(order.discountAmount)}</span>
                  </div>
                )}
                {parseFloat(order.taxAmount ?? '0') > 0 && (
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Thuế</span>
                    <span>{formatVND(order.taxAmount)}</span>
                  </div>
                )}
                {parseFloat(order.shippingFee ?? '0') > 0 && (
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Phí vận chuyển</span>
                    <span>{formatVND(order.shippingFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span>Tổng cộng</span>
                  <span className="text-blue-600">{formatVND(order.total)}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Đã thanh toán</span>
                  <span className="text-green-600">{formatVND(order.paidAmount)}</span>
                </div>
                {parseFloat(order.debtAmount ?? '0') > 0 && (
                  <div className="flex justify-between font-medium text-red-600">
                    <span>Còn nợ</span>
                    <span>{formatVND(order.debtAmount)}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Phương thức</span>
                  <span className="text-gray-900 dark:text-white">
                    {PAYMENT_METHOD_LABELS[order.paymentMethod ?? ''] ?? order.paymentMethod ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Trạng thái TT</span>
                  <span className={`font-medium ${
                    order.paymentStatus === 'paid' ? 'text-green-600' :
                    order.paymentStatus === 'partial' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Lịch sử</h2>
              <div className="space-y-3">
                {[
                  { label: 'Tạo đơn', date: order.createdAt, always: true },
                  { label: 'Xác nhận', date: order.confirmedAt },
                  { label: 'Giao vận', date: order.shippedAt },
                  { label: 'Giao hàng', date: order.deliveredAt },
                  { label: 'Hủy đơn', date: order.cancelledAt },
                ].filter((e) => e.always || e.date).map((event) => (
                  <div key={event.label} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${event.date ? 'bg-blue-500' : 'bg-gray-200'}`} />
                    <div className="flex-1 flex justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-300">{event.label}</span>
                      <span className="text-xs text-gray-400">
                        {event.date ? new Date(event.date).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
