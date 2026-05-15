'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AuthGuard from '@/components/layout/AuthGuard';
import { apiClient } from '@/lib/api-client';

interface ProductionOrder {
  id: string;
  orderCode: string;
  productName: string;
  quantity: number;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function ProductionOrdersPage() {
  const { t } = useTranslation('common');
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/manufacturing/orders');
      setOrders(res.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">{t('manufacturing.productionOrders')}</h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            {t('manufacturing.createOrder')}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">{t('common.loading')}</div>
        ) : orders.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No production orders</div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{order.orderCode}</h3>
                    <p className="text-sm text-gray-500">{order.productName}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                    {t(`manufacturing.status.${order.status}`)}
                  </span>
                </div>
                <div className="mt-3 flex gap-4 text-sm text-gray-600">
                  <span>Qty: {order.quantity}</span>
                  <span>Created: {new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}