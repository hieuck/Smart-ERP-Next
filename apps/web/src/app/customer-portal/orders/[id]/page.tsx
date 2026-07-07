'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { portalApi, type PortalOrder, type OrderTracking } from '@/lib/api-portal';
import AuthGuard from '@/components/layout/AuthGuard';
import { ArrowLeft, Package, Truck, CheckCircle, Clock } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const formatVND = (v: string) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(v ?? '0'));

const STEP_ICONS: Record<string, React.ReactNode> = {
  'Order Placed': <Clock className="w-5 h-5" />,
  'Processing': <Package className="w-5 h-5" />,
  'Shipping': <Truck className="w-5 h-5" />,
  'Delivered': <CheckCircle className="w-5 h-5" />,
};

export default function PortalOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<PortalOrder | null>(null);
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      portalApi.getOrders(),
      portalApi.getOrderTracking(id),
    ])
      .then(([orders, tracking]) => {
        const found = (orders ?? []).find((o: PortalOrder) => o.id === id);
        setOrder(found ?? null);
        setTracking(tracking ?? null);
      })
      .catch(() => router.push('/customer-portal'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center h-64 text-gray-400">
          <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      </AuthGuard>
    );
  }

  if (!order) return null;

  const statusColor = STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700';

  return (
    <AuthGuard>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/customer-portal')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white font-mono">{order.code}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
              {order.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Tracking timeline */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-500" />
                Order Tracking
              </h2>

              {tracking ? (
                <div className="space-y-0">
                  {tracking.steps.map((step, idx) => (
                    <div key={step.step} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          step.completed
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                        }`}>
                          {step.completed ? <CheckCircle className="w-5 h-5" /> : (STEP_ICONS[step.step] ?? <Clock className="w-5 h-5" />)}
                        </div>
                        {idx < tracking.steps.length - 1 && (
                          <div className={`w-0.5 h-8 ${step.completed ? 'bg-green-300' : 'bg-gray-200 dark:bg-gray-600'}`} />
                        )}
                      </div>
                      <div className="pb-6">
                        <p className={`text-sm font-medium ${step.completed ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                          {step.step}
                        </p>
                        {step.date && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(step.date).toLocaleString('vi-VN')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Tracking information not available</p>
              )}
            </div>
          </div>

          {/* Right: Summary */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-500" />
                Order Summary
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Code</span>
                  <span className="font-mono text-gray-900 dark:text-white">{order.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatVND(order.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="text-gray-900 dark:text-white text-xs">
                    {new Date(order.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push('/customer-portal')}
              className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              Back to Portal
            </button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
