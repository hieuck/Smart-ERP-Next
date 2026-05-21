// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiBox, FiPlay, FiCheckCircle, FiClock, FiXCircle } from 'react-icons/fi';
import AuthGuard from '@/components/layout/AuthGuard';
import { apiClient } from '@/lib/api-client';
import { DataTable, Card, Button, Badge, StatCard } from '@smart-erp/ui';

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
      setOrders(res.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge variant="primary" icon={<FiPlay />}>{t('manufacturing.status.in_progress')}</Badge>;
      case 'completed':
        return <Badge variant="success" icon={<FiCheckCircle />}>{t('manufacturing.status.completed')}</Badge>;
      case 'cancelled':
        return <Badge variant="danger" icon={<FiXCircle />}>{t('manufacturing.status.cancelled')}</Badge>;
      case 'draft':
      default:
        return <Badge variant="secondary" icon={<FiClock />}>{t('manufacturing.status.draft')}</Badge>;
    }
  };

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  const columns = [
    {
      header: t('manufacturing.productionOrders') || 'Mã lệnh SX',
      accessor: (row: ProductionOrder) => (
        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{row.orderCode}</span>
      )
    },
    {
      header: t('nav.products') || 'Sản phẩm',
      accessor: 'productName'
    },
    {
      header: t('manufacturing.quantity') || 'Số lượng',
      accessor: (row: ProductionOrder) => (
        <span className="font-semibold">{Number(row.quantity).toLocaleString('vi-VN')}</span>
      )
    },
    {
      header: t('manufacturing.status.draft').replace(t('manufacturing.status.draft'), t('common.status') || 'Trạng thái'),
      accessor: (row: ProductionOrder) => getStatusBadge(row.status)
    },
    {
      header: t('manufacturing.setupTime') ? t('projects.startDate') : 'Ngày bắt đầu',
      accessor: (row: ProductionOrder) => row.startDate
        ? new Date(row.startDate).toLocaleDateString('vi-VN')
        : '-'
    },
    {
      header: t('actions.export.createdAt') || 'Ngày tạo',
      accessor: (row: ProductionOrder) => new Date(row.createdAt).toLocaleDateString('vi-VN')
    },
  ];

  const inProgressCount = orders.filter(o => o.status === 'in_progress').length;
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const draftCount = orders.filter(o => o.status === 'draft').length;

  const FILTERS = [
    { key: 'all', label: t('orders.statusAll') || 'Tất cả' },
    { key: 'draft', label: t('manufacturing.status.draft') },
    { key: 'in_progress', label: t('manufacturing.status.in_progress') },
    { key: 'completed', label: t('manufacturing.status.completed') },
    { key: 'cancelled', label: t('manufacturing.status.cancelled') },
  ];

  return (
    <AuthGuard>
      <div className="space-y-6">
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
          <Button icon={<FiPlus />} variant="primary">
            {t('manufacturing.createOrder')}
          </Button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title={t('manufacturing.stats.totalOrders')}
            value={orders.length}
            icon={<FiBox className="w-5 h-5 text-indigo-500" />}
          />
          <StatCard
            title={t('manufacturing.stats.inProgress')}
            value={inProgressCount}
            icon={<FiPlay className="w-5 h-5 text-blue-500" />}
            className="border-l-4 border-l-blue-500"
          />
          <StatCard
            title={t('manufacturing.stats.completedToday')}
            value={completedCount}
            icon={<FiCheckCircle className="w-5 h-5 text-green-500" />}
            className="border-l-4 border-l-green-500"
          />
          <StatCard
            title={t('manufacturing.status.draft')}
            value={draftCount}
            icon={<FiClock className="w-5 h-5 text-gray-400" />}
            className="border-l-4 border-l-gray-400"
          />
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
        <Card className="shadow-sm border-gray-200 dark:border-gray-800">
          <DataTable
            data={filteredOrders}
            columns={columns}
            loading={loading}
            emptyMessage={t('common.noData') || 'Chưa có lệnh sản xuất nào'}
          />
        </Card>
      </div>
    </AuthGuard>
  );
}
