
'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Box, Play, CheckCircle, Clock, XCircle } from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';
import { apiClient } from '@/lib/api-client';
import { DataTable, Button } from '@smart-erp/shared';

interface ProductionOrder {
  id: string;
  orderCode: string;
  productName: string;
  quantity: number;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

const asArray = <T,>(value: any): T[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

export default function ProductionOrdersPage() {
  const { t } = useTranslation('common');
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/manufacturing/orders');
      setOrders(asArray<ProductionOrder>(res.data));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"><Play className="w-3 h-3" />{t('manufacturing.status.in_progress')}</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><CheckCircle className="w-3 h-3" />{t('manufacturing.status.completed')}</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"><XCircle className="w-3 h-3" />{t('manufacturing.status.cancelled')}</span>;
      case 'draft':
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"><Clock className="w-3 h-3" />{t('manufacturing.status.draft')}</span>;
    }
  };

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  const columns = [
    {
      key: 'orderCode',
      label: t('manufacturing.productionOrders') ,
      render: (row: ProductionOrder) => (
        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{row.orderCode}</span>
      )
    },
    {
      key: 'product',
      label: t('nav.products') ,
      render: (row: ProductionOrder) => row.productName
    },
    {
      key: 'qty',
      label: t('manufacturing.quantity') ,
      render: (row: ProductionOrder) => (
        <span className="font-semibold">{Number(row.quantity).toLocaleString('vi-VN')}</span>
      )
    },
    {
      key: 'status',
      label: t('manufacturing.status.draft').replace(t('manufacturing.status.draft'), t('common.status') ),
      render: (row: ProductionOrder) => getStatusBadge(row.status)
    },
    {
      key: 'startDate',
      label: t('manufacturing.setupTime') ? t('projects.startDate') : 'Ngay bat dau',
      render: (row: ProductionOrder) => row.startDate
        ? new Date(row.startDate).toLocaleDateString('vi-VN')
        : '-'
    },
    {
      key: 'createdAt',
      label: t('common.createdAt') ,
      render: (row: ProductionOrder) => new Date(row.createdAt).toLocaleDateString('vi-VN')
    },
  ];

  const inProgressCount = orders.filter(o => o.status === 'in_progress').length;
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const draftCount = orders.filter(o => o.status === 'draft').length;

  const FILTERS = [
    { key: 'all', label: t('orders.statusAll')  },
    { key: 'draft', label: t('manufacturing.status.draft') },
    { key: 'in_progress', label: t('manufacturing.status.in_progress') },
    { key: 'completed', label: t('manufacturing.status.completed') },
    { key: 'cancelled', label: t('manufacturing.status.cancelled') },
  ];

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('manufacturing.productionOrders')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('manufacturing.subtitle')}
            </p>
          </div>
          <Button variant="primary">
            <Plus className="w-4 h-4" />
            {t('manufacturing.createOrder')}
          </Button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
              <Box className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('manufacturing.stats.totalOrders')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4 border-l-4 border-l-blue-500">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Play className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('manufacturing.stats.inProgress')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{inProgressCount}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4 border-l-4 border-l-green-500">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('manufacturing.stats.completedToday')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedCount}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4 border-l-4 border-l-gray-400">
            <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/20">
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('manufacturing.status.draft')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{draftCount}</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                statusFilter === f.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <DataTable
            data={filteredOrders}
            columns={columns}
            loading={loading}
            emptyMessage={t('common.noData') }
          />
        </div>
      </div>
    </AuthGuard>
  );
}

