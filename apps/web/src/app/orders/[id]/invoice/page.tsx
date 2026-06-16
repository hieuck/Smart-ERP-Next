'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/layout/AuthGuard';
import { Printer, ArrowLeft } from 'lucide-react';

interface Order {
  id: string;
  code: string;
  createdAt: string;
  customerName: string;
  total: number;
  paidAmount: number;
  debtAmount: number;
  status: string;
  paymentStatus: string;
  items: Array<{ productName: string; quantity: number; unitPrice: number; lineTotal: number }>;
}

export default function OrderInvoicePage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(`/orders/${id}`)
      .then(res => setOrder(res.data))
      .catch(() => router.push('/orders'))
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    if (!order || searchParams.get('print') !== '1') return;
    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, [order, searchParams]);

  const formatVND = (v: number | string | null | undefined) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
      Number.parseFloat(String(v ?? '0')) || 0,
    );

  const printInvoice = () => {
    window.print();
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center h-64 text-gray-400">{t('common.loading')}</div>
      </AuthGuard>
    );
  }

  if (!order) return null;

  return (
    <AuthGuard>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Quay lại đơn hàng
          </button>
          <button onClick={printInvoice} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Printer className="w-4 h-4" /> In / Lưu PDF
          </button>
        </div>

        <div id="invoice-content" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 print:shadow-none print:border-0">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">HÓA ĐƠN BÁN HÀNG</h1>
            <p className="text-sm text-gray-500 mt-1">Smart ERP Next</p>
            <p className="text-gray-500">{order.code}</p>
          </div>

          <div className="flex justify-between mb-8">
            <div>
              <p className="font-semibold">Khách hàng:</p>
              <p>{order.customerName || 'Khách lẻ'}</p>
            </div>
            <div className="text-right">
              <p>Ngày: {new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
              <p>Số hóa đơn: {order.code}</p>
            </div>
          </div>

          <table className="w-full text-left border-collapse mb-6">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2">Mặt hàng</th>
                <th className="py-2 text-right">SL</th>
                <th className="py-2 text-right">Đơn giá</th>
                <th className="py-2 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-2">{item.productName}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">{formatVND(item.unitPrice)}</td>
                  <td className="py-2 text-right">{formatVND(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-1">
              <div className="flex justify-between">
                <span>Tạm tính:</span>
                <span>{formatVND(order.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Đã thanh toán:</span>
                <span>{formatVND(order.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Còn lại:</span>
                <span>{formatVND(order.debtAmount || 0)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-400 print:mt-4">
            Cảm ơn quý khách
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
